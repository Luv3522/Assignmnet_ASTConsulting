const mongoose = require('mongoose');
const {Schema} = mongoose;
const ImageSchema = new Schema({
    name: String,
    title: String,
    description: String,
    imageUrl: String,
});

const Image = mongoose.model('Image',ImageSchema);

module.exports = Image;