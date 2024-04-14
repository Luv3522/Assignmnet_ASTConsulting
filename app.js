
const express =  require("express")
var authRouter = require('./routes/auth');
var passport = require('passport');
const mongoose = require('mongoose')
var db = require('./database')
const ejs = require('ejs');
const path = require('path')
const bcrypt = require('bcryptjs');
const User = require('./models/users');
const Image = require('./models/image');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const multer = require("multer")
const dotenv = require('dotenv')
const {S3Client,PutObjectCommand,GetObjectCommand, DeleteObjectCommand} = require('@aws-sdk/client-s3')
const {getSignedUrl} = require('@aws-sdk/s3-request-presigner');
const { randomUUID } = require("crypto");
//require('passport-google')

require('./routes/auth');
//require('./passportConfig');


dotenv.config();


const bucket_name = process.env.BUCKET_NAME;
const bucket_region = process.env.BUCKET_REGION;
const access_key = process.env.ACCESS_KEY;
const secret_access_key = process.env.SECRET_ACCESS_KEY;

//creating new client for contacting with aws s3 bucket
const s3 = new S3Client({
    credentials: {
        accessKeyId: access_key,
        secretAccessKey: secret_access_key,
    },
    region: bucket_region
});

const app = express();
app.use(passport.initialize());
// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.listen(3000,() => {
    console.log("listening on http://localhost:3000");
})
db.connect();

const storage = multer.memoryStorage();
const upload = multer({storage : storage});
//upload.single('image');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//route for rendering the home page
app.get("/", (req,res) => {
    //res.set("content-type","text/html");
    res.render('home');
});

// handling google authnetication
app.get("/auth/google",
    passport.authenticate('google',{scope : ['email', 'profile']})
);
function isLoggedIn(req,res,next){
    req.user ? next() : res.sendStatus(401);
}
app.get("/google/callback",
    passport.authenticate('google', {successRedirect: "/protected", failureRedirect: '/' })
)
app.get("/signUp", (req,res) => {
    
    res.render('signup');
});
app.post("/auth/signup",
    async (req,res) => {
        const {username,password} = req.body;

        let user = await User.findOne({username});

        if(user){
            return res.status(400).send('User already Exists');
        }

        user = new User({username,password});
        await user.save();

        res.redirect('/login');
    }
);


//rendering the loging page
app.get("/login", (req,res) => {
    
    res.render('login');
});
app.post(
    "/auth/login",
    async (req,res) => {
        const {username,password}=req.body;

        console.log(req.body.username);
        console.log(req.body.password);
        const user = await User.findOne({username});

        console.log(user);
        if(user===null){
            return res.status(401).send("User does not exist");
        }
        //decrypting the password and matching it with the password get from the request body
        const match = await bcrypt.compare(password, user.password);

        if(!user || !match){
            return res.status(401).send('Invalid username or password');
        }


        //Generate JWT token
        const token = jwt.sign({username: user.username}, 'secret key',{expiresIn: "1h"});
        //res.json({token});
        res.render("./auth",{token});
        // res.redirect("/auth");
        // if(token){
        //     res.render("./auth");
        // }
    }
   );

//middleware for verifying the jwt token
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided' });
    }
    jwt.verify(token, secretKey, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
};


//for jwt authentication
app.get("/auth",verifyToken, (req,res) => {
    
    res.render('auth');
});
//for google authentication
app.get("/protected",isLoggedIn, (req,res) => {
    
    res.render('auth');
});

app.get("/upload", (req,res) => {
    
    res.render('upload');
});
app.post("/image/upload", upload.single('image'), async (req,res) => {
    console.log("req.body",req.body);
    console.log("req.file",req.file);
    //req.file.buffer

    

    const params = {
        Bucket: bucket_name,
        Key: req.body.img_id,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
    }

    

    const command = new PutObjectCommand(params);
    await s3.send(command);
    var img_id = req.body.img_id;
    var name = req.file.originalname;
    var title = req.body.title;
    var desc = req.body.description;
    //var imageUrl=url;

    const getObjectParams = {
        Bucket: bucket_name,
        Key: req.body.img_id,
    }
    const getCommand = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3,getCommand);

    console.log("urls is-> ",url);
    var imageUrl=url;


    
    console.log("image is ->",img_id,name,title,desc);
    //creating image object to save the image info in the database
    let image = new Image({
        img_id: img_id,
        name: name,
        title: title,
        description: desc,
        imageUrl: imageUrl});
    console.log("image is ->",image);
    await image.save();
    res.send({image,imageUrl});



});

//sending image info in json format 
app.get("/image/all" ,async (req,res) =>{

    const images = await Image.find();

    for(const img of images){
        const getObjectParams = {
            Bucket: bucket_name,
            Key: img.name,
        }

        const command = new GetObjectCommand(getObjectParams);
        const url = await getSignedUrl(s3,command);
        img.imageUrl=url;
        
    }

    
    res.send(images);


});


app.get('/delete', (req,res) => {
    res.render('./delete');
})

app.post("/image/delete", async (req,res) => {

    const id = req.body.imgId;
    console.log(req.body);
    const img = await Image.findById({img_id:id});
    //await Image.findByIdAndDelete({id});
    console.log(img);
    if(!img){
        res.statusCode(404).send("Image Not Found");
    }

    const params = {
        Bucket: bucket_name,
        Key: img.img_id,
    }
    const command = new DeleteObjectCommand(params);
    await s3.send(command);

    await Image.deleteOne({ObjectId:id});

    res.redirect('/image/all');

})

app.get('/update', (req,res) => {
    res.render('./update');
})

app.post('/image/update' ,async (req,res) => {

    const id  = req.body.imgId;
    const title = req.body.title;
    const desc = req.body.description;
    console.log(req.body);

    try {
        // Find the image by ID and update its information
        console.log(id,title,desc);
        const image = await Image.findOne({img_id:id});
        console.log(image);
        const updatedImage = await Image.findOneAndUpdate(id, {
            title,
            desc,
        }, { new: true }); // Set { new: true } to return the updated document

        if (!updatedImage) {
            return res.status(404).send('Image not found');
        }

        res.send('Image info updated successfully');
    } catch (error) {
        console.error('Error updating image:', error);
        res.status(500).send('Internal Server Error');
    }


})
  






