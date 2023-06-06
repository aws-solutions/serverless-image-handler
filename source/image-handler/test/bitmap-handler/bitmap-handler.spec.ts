// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import Jimp from 'jimp';
import { BitmapRequest } from '../../bitmap-handler';
import fs from 'fs';
import { ImageHandlerError, StatusCodes } from '../../lib';

// Mock the Jimp module to prevent actual image processing during tests
jest.mock('jimp', () => ({
    read: jest.fn()
}));

describe('BitmapRequest', () => {
    describe('convertToPng', () => {
        const mockedRead = Jimp.read as jest.MockedFunction<typeof Jimp.read>;

        afterEach(() => {
            jest.resetAllMocks();
        });

        it('should convert the image buffer to PNG format', async () => {
            const imageBuffer = Buffer.from('mocked image buffer');
            const pngBuffer = Buffer.from('mocked PNG buffer');

            mockedRead.mockResolvedValueOnce({
                getBufferAsync: jest.fn().mockResolvedValueOnce(pngBuffer)
            } as unknown as Jimp);

            const bitmapRequest = new BitmapRequest();
            const result = await bitmapRequest.convertToPng(imageBuffer);

            expect(mockedRead).toHaveBeenCalledWith(imageBuffer);
            expect(result).toEqual(pngBuffer);
        });

        it('should be able to identify bitmap format', async () => {
            const bmpImage = fs.readFileSync('./test/image/4bd7eaa44283d58f4603a240d6ead553.bmp');
            const pngImage = fs.readFileSync('./test/image/4bd7eaa44283d58f4603a240d6ead553.png');
            const jpgImage = fs.readFileSync('./test/image/1x1.jpg');

            const bmpBuffer = Buffer.from(bmpImage);
            const pngBuffer = Buffer.from(pngImage);
            const jpgBuffer = Buffer.from(jpgImage);

            const bitmapRequest = new BitmapRequest();

            expect(true).toEqual(bitmapRequest.isBmp(bmpBuffer));
            expect(false).toEqual(bitmapRequest.isBmp(pngBuffer));
            expect(false).toEqual(bitmapRequest.isBmp(jpgBuffer));

        });

        it('should convert the image file to PNG format', async () => {
            const originalImage = fs.readFileSync('./test/image/4bd7eaa44283d58f4603a240d6ead553.bmp');
            const pngImage = fs.readFileSync('./test/image/4bd7eaa44283d58f4603a240d6ead553.png');

            const imageBuffer = Buffer.from(originalImage);
            const pngBuffer = Buffer.from(pngImage);

            mockedRead.mockResolvedValueOnce({
                getBufferAsync: jest.fn().mockResolvedValueOnce(pngBuffer)
            } as unknown as Jimp);

            const bitmapRequest = new BitmapRequest();
            const result = await bitmapRequest.convertToPng(imageBuffer);

            expect(mockedRead).toHaveBeenCalledWith(imageBuffer);
            expect(result).toEqual(pngBuffer);
        });

        it('should throw an error if an error occurs during conversion', async () => {
            const imageBuffer = Buffer.from('mocked image buffer');
            const error = new ImageHandlerError(StatusCodes.BAD_REQUEST, 'BitmapRequest::convertToPng', 'It was not possible to convert buffer to png buffer');

            mockedRead.mockRejectedValueOnce(error);

            const bitmapRequest = new BitmapRequest();

            await expect(bitmapRequest.convertToPng(imageBuffer)).rejects.toThrowError(error);
        });
    });
});