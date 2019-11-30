#!/usr/bin/env node

const debug = require("./src/debug");
const express = require('express')
const bodyParser = require("body-parser")
const cookieParser = require("cookie-parser")
var cors = require('cors');

const app = express()
const args = process.argv;
var port = 3000






var fs = require('fs')
var morgan = require('morgan')
var path = require('path')

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {
  flags: 'a'
})
app.use(morgan('dev', {
  stream: accessLogStream
}))

//const { Client,  RequestParams } = require('@elastic/elasticsearch')
//const client = new Client({ node: 'http://130.245.171.109:9200' })
//app.use(client);

//optional port setting
if (args.includes("-p")) {
  port = args[args.indexOf("-p") + 1];
}

app.use(bodyParser());


app.use(cookieParser());

app.use(cors());

app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());

// require('./src/schema');
app.use(require('./src/routes'));


app.listen(port, () => console.log(`Example app listening on port ${port}!`))