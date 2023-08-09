use image::{ImageEncoder, ImageFormat};
use image::codecs::jpeg::JpegEncoder;
use image::codecs::png::PngEncoder;
use image::codecs::webp::WebPEncoder;
use lambda_http::{Body, Error, Request, RequestExt, Response, run, service_fn};
use reqwest::Response as ReqwestResponse;
use thumbhash::{rgba_to_thumb_hash, thumb_hash_to_rgba};
use tracing::info;
use tracing::warn;

const MIME_WEBP: &'static str = "image/webp";
const MIME_PNG: &'static str = "image/png";
const MIME_JPG: &'static str = "image/jpg";

/// This is the main body for the function.
/// Write your code inside it.
/// There are some code example in the following URLs:
/// - https://github.com/awslabs/aws-lambda-rust-runtime/tree/main/examples
async fn function_handler(event: Request) -> Result<Response<Body>, Error> {
    // Extract some useful information from the request
    let (get_response, format) = match get_image(event.raw_http_path()).await {
        Ok((binary, format)) => (binary, format),
        Err(e) => return Ok(Response::builder()
            .status(404)
            .body(e.to_string().into())
            .unwrap())
    };
    let accept = event.headers().get("Accept")
        .map(|h| h.to_str().unwrap_or(""))
        .unwrap_or("");
    let resp = match thumbnail(get_response, format, accept).await {
        Ok((mime, thumbhash)) => Response::builder()
            .status(200)
            .header("content-type", mime)
            .body(thumbhash.into())
            .map_err(Box::new)?,
        Err(e) => {
            warn!("Error: {:?}", e);
            Response::builder()
                .status(500)
                .body(e.to_string().into())
                .map_err(Box::new)?
        }
    };
    Ok(resp)
}

async fn thumbnail(response: ReqwestResponse, image_format: ImageFormat, accept: &str) -> Result<(&str, Vec<u8>), Error> {
    let binary = response.bytes().await?;
    let image = image::load_from_memory_with_format(binary.as_ref(), image_format)?;

    // Convert the input image to RgbaImage format and retrieve its raw data, width, and height
    let rgba = image.to_rgba8().into_raw();
    let width = image.width() as usize;
    let height = image.height() as usize;

    // Compute the ThumbHash of the input image
    let thumb_hash = rgba_to_thumb_hash(width, height, &rgba);

    // Convert the ThumbHash back to RgbaImage format
    let (_w, _h, rgba2) = thumb_hash_to_rgba(&thumb_hash).unwrap();

    // Return something that implements IntoResponse.
    // It will be serialized to the right response event automatically by the runtime

    let mut buf = Vec::new();
    if accept.contains(MIME_PNG) {
        PngEncoder::new(&mut buf)
            .write_image(&rgba2,
                         _w as u32,
                         _h as u32,
                         image::ColorType::Rgba8)?;
        info!("Returning {} bytes of {}", buf.len(), MIME_PNG);
        Ok((MIME_PNG, buf))
    } else if accept.contains(MIME_WEBP) {
        WebPEncoder::new(&mut buf)
            .write_image(&rgba2,
                         _w as u32,
                         _h as u32,
                         image::ColorType::Rgba8)?;
        info!("Returning {} bytes of {}!", buf.len(), MIME_WEBP);
        Ok((MIME_WEBP, buf))
    } else {
        JpegEncoder::new(&mut buf)
            .write_image(&rgba2,
                         _w as u32,
                         _h as u32,
                         image::ColorType::Rgba8)?;
        info!("Returning {} bytes of {}!", buf.len(), MIME_JPG);
        Ok((MIME_JPG, buf))
    }
}

async fn get_image(path: &str) -> Result<(ReqwestResponse, ImageFormat), Error> {
    let url = format!("{}{}", "https://images.t-online.de", path);
    info!("Fetching image {}!", url);
    let response = reqwest::get(url)
        .await?;
    let image_format = ImageFormat::from_mime_type(response.headers().get("content-type")
        .map(|v| v.to_str().unwrap())
        .unwrap_or("image/jpeg"))
        .unwrap_or(ImageFormat::Jpeg);

    info!("Fetched image http/{} format={:?}!", response.status(), image_format);
    Ok((response, image_format))
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        // disable printing the name of the module in every log line.
        .with_target(false)
        // disabling time is handy because CloudWatch will add the ingestion time.
        .without_time()
        .init();

    run(service_fn(function_handler)).await
}
