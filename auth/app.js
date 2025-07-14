var express = require('express'),
    handlebars = require('express-handlebars').create({defaultLayout: 'main'}),
    cookieParser = require('cookie-parser'),
    sessions = require('express-session'),
    bodyParser = require('body-parser'),
    https = require('https'),
    fs = require('fs'),
    md5 = require('md5'),
    mongoose = require('mongoose'),
    credentials = require('./credentials'),
    Users = require('./models/uCredentials.js');
// load env variables
const dotenv = require("dotenv");
    dotenv.config();

var app = express();
//db connection
mongoose
	.connect(process.env.MONGO_URI, {
		useUnifiedTopology: true,
		useNewUrlParser: true,
	})
	.then(() => console.log("DB Connected"));

mongoose.connection.on("error", (err) => {
	console.log(`DB connection error: ${err.message}`);
});

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser(credentials.cookieSecret));
app.use(sessions({
    resave: true,
    saveUninitialized: false,
    secret: credentials.cookieSecret,
    cookie: {maxAge: 3600000},
}));

app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3100);

app.get('/', function(req, res){
    res.render('login');
});

function checklogin (req, res, user, password) {
    Users.findOne({uname: user}, function(err, user) {

        if(err){
            return res.status(500).send("Database error!");
        }
        if(!user){
            return res.render('login', { message: 'User does not exist!' });
        }
        if(user.pass === md5(password)) {
            req.session.userName = user;
            res.redirect(303, '/home');
        } else{
            res.render('login',{message: 'Password is invalid!' });
        }

    });
};

app.post('/processLogin', function(req, res){
    if (req.body.buttonVar == 'login') {
        checklogin(req, res, req.body.uname.trim(), req.body.pword.trim())
    } else {
        res.redirect(303, 'register');
    }
});

app.post('/processReg', function(req, res){
  

    if (req.body.pword!==req.body.pword2) {
        return res.render('register', { message: 'Passwords do not match!' });
    }

    Users.findOne({uname:req.body.uname.trim()}, function(err, user){
        if(user){
            return res.render('register', {message:'Username already exists!' });
        }
        if(err) {
            return res.status(500).send("Database error!");
        }
        
        const newUser = new Users({
            uname: req.body.uname.trim(),
            pass:md5(req.body.pword.trim())
        });

        newUser.save(function (err){
            if(err){
                return res.status(500).send("Error in saving new users!");
            }
            res.redirect(303,'/');
        });
    });
});

app.get('/home', function(req, res) {
    if (req.session.userName) {
        res.render('home');
    } else {
        res.render('login',{message: 'Please login to access the home page'});
    }
});

app.get('/page2', function(req, res) {
    if (req.session.userName) {
        res.render('page2');
    } else {
        res.render('login',{message: 'Please login to access the second page'});
    }
});

app.get('/register', function(req, res) {
    res.render('register');
});

app.get('/logout', function(req, res) {
    delete req.session.userName;
    res.redirect(303,'/');
})


app.listen(app.get('port'), function(){
    console.log('Express started on http://localhost:' + app.get('port') + '; press Ctrl-C to terminate');
});

process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error.message);
});