"use strict";

/**
 * Module dependencies
 */

/* eslint-disable no-unused-vars */
// Public node modules.
const _ = require("lodash");
const AWS = require("aws-sdk");
const sharp = require("sharp");

const trimParam = (str) => (typeof str === "string" ? str.trim() : undefined);

module.exports = {
  provider: "aws-s3",
  name: "Amazon Web Service S3",
  auth: {
    public: {
      label: "Access API Token",
      type: "text",
    },
    private: {
      label: "Secret Access Token",
      type: "text",
    },
    region: {
      label: "Region",
      type: "enum",
      values: [
        "us-east-1",
        "us-east-2",
        "us-west-1",
        "us-west-2",
        "ca-central-1",
        "ap-south-1",
        "ap-northeast-1",
        "ap-northeast-2",
        "ap-northeast-3",
        "ap-southeast-1",
        "ap-southeast-2",
        "cn-north-1",
        "cn-northwest-1",
        "eu-central-1",
        "eu-north-1",
        "eu-west-1",
        "eu-west-2",
        "eu-west-3",
        "sa-east-1",
      ],
    },
    bucket: {
      label: "Bucket",
      type: "text",
    },
  },
  init: (config) => {
    // configure AWS S3 bucket connection
    AWS.config.update({
      accessKeyId: trimParam(config.public),
      secretAccessKey: trimParam(config.private),
      region: config.region,
    });

    const S3 = new AWS.S3({
      apiVersion: "2006-03-01",
      params: {
        Bucket: trimParam(config.bucket),
      },
    });

    return {
      upload: (file) => {
        const webP = await sharp(file.buffer).webp().toBuffer()
        .then(data => ({buffer: data, mime:'image/webp', ext: '.webp'}));
        return new Promise((resolve, reject) => {
          // upload file on S3 bucket
          const path = file.path ? `${file.path}/` : "";
          S3.upload(
            {
              Key: `${path}${file.hash}${file.ext}`,
              Body: new Buffer(file.buffer, "binary"),
              ACL: "public-read",
              ContentType: file.mime,
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }

              // set the bucket file url
              file.url = data.Location;

              resolve();
            }
          );
          /* Upload the .webp */
          S3.upload(
            {
              Key: `${path}${file.hash}.webp`,
              Body: new Buffer(webP.buffer, "binary"),
              ACL: "public-read",
              ContentType: webP.mime,
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }

              // set the bucket file url
              file.url = data.Location;

              resolve();
            }
          );
        });
      },
      delete: (file) => {
        return new Promise((resolve, reject) => {
          // delete file on S3 bucket
          const path = file.path ? `${file.path}/` : "";
          S3.deleteObject(
            {
              Key: `${path}${file.hash}${file.ext}`,
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }

              resolve();
            }
          );
          S3.deleteObject(
            {
              Key: `${path}${file.hash}.webp`,
            },
            (err, data) => {
              if (err) {
                return reject(err);
              }

              resolve();
            }
          );
        });
      },
    };
  },
};
