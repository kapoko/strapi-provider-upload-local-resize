'use strict';

/**
* Module dependencies
*/

// Public node modules.
const fs = require('fs');
const path = require('path');
var Jimp = require('jimp');

// Default config, override with your-strapi-project/config/custom.json with setting "imageVariants"
const defaultImageVariants = [
    {
        maxSize: 900,
        scaleType: 'resize',
        prefix: 'large_',
        quality: 70,
        attributes: 'url'
    },
    {
        maxSize: 600,
        scaleType: 'cover',
        prefix: 'thumb_',
        quality: 70,
        attributes: 'thumb'
    }
]

const resize = (file, variant) => {
    return Jimp.read(file.buffer)
        .then(image => {
            //largest
            let destImg = path.join(strapi.config.appPath, 'public', `uploads/${variant.prefix}${file.hash}${file.ext}`)
            //change to preferences https://www.npmjs.com/package/jimp
            if (variant.scaleType !== "resize") {
                //cover image
                image.cover(variant.maxSize, variant.maxSize);
            } else {
                //width, height
                image.resize(Jimp.AUTO, variant.maxSize);
            }

            image.quality(variant.quality);
            image.write(destImg);
            file[variant.attributes] = `/uploads/${variant.prefix}${file.hash}${file.ext}`;
            return true;
        })
        .catch(err => {
            return reject(err);
        });
}

module.exports = {
    provider: 'local-resize',
    name: 'Local Upload Resize',
    init: (config) => {
        return {
            upload: (file) => {
                return new Promise((resolve, reject) => {
                    // Define variants, props should be defined in plugins/uploads/models/File.settings.json
                    var variants = strapi.config.imageVariants || defaultImageVariants;
                    
                    // Construct array of promises for each variant
                    let resizeFunctions = variants.map(variant => {
                        return () => resize(file, variant);
                    })
                    
                    // Resize file for all variants
                    resizeFunctions.reduce(function (prev, curr) {
                        return prev.then(curr);
                    }, Promise.resolve()).then(() => {
                        return resolve();
                    }).catch(err => {
                        return reject(err);
                    });
                });
            },
            delete: (file) => {
                return new Promise((resolve, reject) => {
                    var variants = strapi.config.imageVariants || defaultImageVariants;

                    // Construct array of promises for each variant
                    let deleteFunctions = variants.map(variant => {
                        return new Promise((resolve, reject) => {
                            const filePath = path.join(strapi.config.appPath, 'public', `uploads/${variant.prefix}${file.hash}${file.ext}`);

                            if (!fs.existsSync(filePath)) {
                                return resolve('File doesn\'t exist');
                            }
                            // remove file from public/assets folder
                            fs.unlink(filePath, (err) => {
                                if (err) {
                                    return reject(err);
                                }
                                resolve();
                            });
                        });
                    })

                    // Delete all files
                    deleteFunctions.reduce(function (prev, curr) {
                        return prev.then(curr);
                    }, Promise.resolve()).then(() => {
                        return resolve();
                    }).catch(err => {
                        return reject(err);
                    });                    

                });
            }
        }
    }
};
