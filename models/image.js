const mongoose = require('mongoose');
const {Schema} = mongoose;
const ImageSchema = new Schema({
    img_id: String,
    name: String,
    title: String,
    description: String,
    imageUrl: String,
});

const Image = mongoose.model('Image',ImageSchema);

module.exports = Image;