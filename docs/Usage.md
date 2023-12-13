# Usage

It is recommended to have a look at the [output options](https://sharp.pixelplumbing.com/api-output), 
[resize operations](https://sharp.pixelplumbing.com/api-resize) and [image operations](https://sharp.pixelplumbing.com/api-operation).

### Feature: AUTO WEBP

The CDN is configured to respect the value of the `Accept` HTTP header. Given
there are 2 different browsers, one supports `webp`, one does not:

```shell
$ curl -v 'https://images.t-online.de/4k_hdr.jpg' \
        --header 'Accept: image/webp'
...
< HTTP/2 200
< content-type: image/webp
...
```

```shell
$ curl -v 'https://images.t-online.de/4k_hdr.jpg'
...
< HTTP/2 200
< content-type: image/jpeg
...
```

### (custom/experimental) Feature: Caching, Cache headers

#### Cache-Control

By default, every item has a `Cache-Control: public, max-age=31536000, immutable`. Images are immutable 
within the CMS, so there is a `immutable` flag at the moment.
If the image has an expiry date in the CMS, there should be a `Expires` header present and the
`Cache-Control` will be reduced accordingly.

After content has expired, a S3 lifecycle rule should automatically delete the master image from
the bucket.

A sample response could look like this:

```shell
$ curl -v https://images.t-online.de/GQSyGuVtRUsD/stimpson-stimpy-j-katzwinkel-ein-fetter-einfach-strukturierter-kater-aufnahme-aus-fruehester-kindheit.png
...
< HTTP/2 200
< date: Fri, 15 Jan 2021 10:45:05 GMT
< content-type: image/png
< content-length: 2371
< expires: Sat, 01 Jan 2022 01:00:00 GMT
< last-modified: Fri, 15 Jan 2021 10:44:25 GMT
< cache-control: max-age=30291336,public
... 
```

#### ETag

Each item has a strong `ETag` which should allow conditional requests. `ETag` are strong
validators:

```shell
$ curl -v 'https://images.t-online.de/4k_hdr.jpg' \
      --header 'Accept: image/webp' \
      --header 'If-None-Match: "c84339d0817baaba0726aeb5b8532d55"'
...
< HTTP/2 304
...
```

#### Date

There is also a `Date` header with also allows conditional requests. `This is a weak validator.

```shell
$ curl -v 'https://images.t-online.de/4k_hdr.jpg' \
       --header 'Accept: image/webp,*/*' \
       --header 'If-Modified-Since: Fri, 15 Jan 2021 09:55:58 GMT'
...
< HTTP/2 304
...       
```

## Filters

Most of the filter are documented on the [AWS Solution page](https://docs.aws.amazon.com/solutions/latest/serverless-image-handler/appendix-d.html).

Here is a tl;dr for the most important ones, demonstrated on an image from [the internet](https://wallpapersafari.com/w/pEwDaY):
### #nofilter

will simply output the original image as is 
![original](https://images.t-online.de/4k_hdr.jpg)
https://images.t-online.de/4k_hdr.jpg

### Resize `/fit-in/${WIDTH}x${HEIGHT}/` 

this resizes the original image within the given rectangle without changing
the original image ratio. You can either set both `WIDTH` and `HEIGHT` or limit the image in either dimension
  by setting the other dimension to `0`, e.g. only set the width to 666 px and scale the height accordingly
  `/fit-in/666x0/`

![resized](https://images.t-online.de/fit-in/666x0/4k_hdr.jpg)

[`https://images.t-online.de/fit-in/666x0/4k_hdr.jpg`](https://images.t-online.de/fit-in/666x0/4k_hdr.jpg)

### Cropping `/${X}x${Y}:${WIDTH}x${HEIGHT}/`

starting from a `Point(x, y)` cut a rectangle sized `width x height`, without further resizing. 

![crop](https://images.t-online.de/1800x1450:888x500/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/4k_hdr.jpg)

### Effects `/filters:blur(7)/`

![crop](https://images.t-online.de/1800x1450:888x500/filters:blur(7)/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/filters:blur(7)/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/filters:blur(7)/4k_hdr.jpg)

### Effects `/filters:grayscale()/`

![crop](https://images.t-online.de/1800x1450:888x500/filters:grayscale()/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/filters:grayscale()/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/filters:grayscale()/4k_hdr.jpg)

### Effects `/filters:quality(0-100)/`

change the quality, [default is 80][output options]

![crop](https://images.t-online.de/1800x1450:888x500/filters:quality(1)/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/filters:quality(1)/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/filters:quality(1)/4k_hdr.jpg)

### Effects `/filters:rotate(0-360)/`

![crop](https://images.t-online.de/1800x1450:888x500/filters:rotate(180)/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/filters:rotate(180)/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/filters:rotate(180)/4k_hdr.jpg)

### Effects `/filters:roundCrop()/`

![crop](https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/4k_hdr.jpg)

Again, you can create custom ellipsis by specifying the coordinates like before: `/${X}x${Y}:${WIDTH}x${HEIGHT}/`

![crop](https://images.t-online.de/1800x1450:888x500/filters:roundCrop(444x250:300x75)/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/filters:roundCrop(444x250:300x75)/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/filters:roundCrop(444x250:300x75)/4k_hdr.jpg)

It is suggested to force _PNG_ as format, as _JPEG_ does not (?) support transparent backgrounds.
So in case a _JPEG_ is used (like here) and your Browser does not support _WEBP_, there will be a
black frame.

#### PNG

![crop](https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/filters:format(png)/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/filters:format(png)/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/filters:format(png)/4k_hdr.jpg)

#### JPEG

![crop](https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/filters:format(jpeg)/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/filters:format(jpeg)/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/filters:format(jpeg)/4k_hdr.jpg)

### Effects `/filters:rotate(180)/`

![crop](https://images.t-online.de/1800x1450:888x500/filters:roundCrop()/4k_hdr.jpg)

[`https://images.t-online.de/1800x1450:888x500/filters:rotate(180)/4k_hdr.jpg`](https://images.t-online.de/1800x1450:888x500/filters:rotate(180)/4k_hdr.jpg)

## Try it out

Visit the [Demo UI](https://master-images-053041861227-eu-west-1.s3-eu-west-1.amazonaws.com/index.html), enter the following

* `bucket name = master-images-053041861227-eu-west-1`
* `image key = oat.jpg`

There are many other images already automatically imported into the image bucket, just check the API for more `keys`.