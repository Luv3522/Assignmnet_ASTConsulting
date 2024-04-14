
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
//require('passport-google')

require('./routes/auth');

dotenv.config();

const bucket_name = process.env.BUCKET_NAME;
const bucket_region = process.env.BUCKET_REGION;
const access_key = process.env.ACCESS_KEY;
const secret_access_key = process.env.SECRET_ACCESS_KEY;

const s3 = new S3Client({
    credentials: {
        accessKeyId: access_key,
        secretAccessKey: secret_access_key,
    },
    region: bucket_region
});

const app = express();
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

app.get("/", (req,res) => {
    //res.set("content-type","text/html");
    res.render('home');
});

app.get("/auth/google",
    passport.authenticate('google',{scope : ['email', 'profile']})
);
app.get("/google/callback",
    passport.authenticate('google', {
        failureRedirect: '/'}),
    function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/protected');
      }
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

function isLoggedIn(req,res,next){
    req.user ? next() : res.sendStatus(401);
}

app.get("/auth",verifyToken, (req,res) => {
    
    res.render('auth');
});

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
        Key: req.file.originalname,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
    }

    

    const command = new PutObjectCommand(params);
    await s3.send(command);

    var name = req.file.originalname;
    var title = req.body.title;
    var desc = req.body.description;
    //var imageUrl=url;

    const getObjectParams = {
        Bucket: bucket_name,
        Key: req.file.originalname,
    }
    const getCommand = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3,getCommand);

    console.log("urls is-> ",url);
    var imageUrl=url;


    
    console.log("image is ->",name,title,desc);
    let image = new Image({name: name,
        title: title,
        description: desc,
        imageUrl: imageUrl});
    console.log("image is ->",image);
    await image.save();
    res.send({image,imageUrl});



});
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

    const id = req.query.imgId;
    console.log(req.query);
    const img = await User.findById(id);
    if(!img){
        res.statusCode(404).send("Image Not Found");
        return;
    }

    const params = {
        Bucket: bucket_name,
        Key: img.name,
    }
    const command = new DeleteObjectCommand(params);
    await s3.send(command);

    await User.deleteOne(id);

    res.redirect('/images/all');

})
  






