// const { MongoClient } = require("mongodb");

// // Replace the uri string with your connection string.
// const uri =
//   "mongodb+srv://20ucs107:lNWv3FQKZGXhzK8z@cluster0.qx0mtzf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// const client = new MongoClient(uri);
// let conn;
// async function run() {
//   try {
//     conn = await client.connect();
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);

// let db = conn.db("ImageGallery")

// module.exports=db;
const mongoose = require("mongoose");
mongoose.Promise = global.Promise;
//smongodb+srv://20ucs107:lNWv3FQKZGXhzK8z@cluster0.qx0mtzf.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
const dbUrl = "mongodb+srv://20ucs107:Rsl1Zupo3xLrKoVB@cluster0.co6cywr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
//mongodb+srv://20ucs107:Rsl1Zupo3xLrKoVB@cluster0.co6cywr.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
const connect = async () => {
 mongoose.connect(dbUrl, { useNewUrlParser: true, useUnifiedTopology: true });
 const db = mongoose.connection;
 db.on("error", () => {
   console.log("could not connect");
 });
 db.once("open", () => {
   console.log("> Successfully connected to database");
 });
};
module.exports = { connect };