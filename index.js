const express = require("express");
const res = require("express/lib/response");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const { process_params } = require("express/lib/router");
const fs = require("fs");
const formidable = require("formidable");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SpeechToTextV1 = require("ibm-watson/speech-to-text/v1");
const { IamAuthenticator } = require("ibm-watson/auth");
const LanguageTranslatorV3 = require("ibm-watson/language-translator/v3");
const { streamToPromise } = require("ibm-cloud-sdk-core");
const NaturalLanguageUnderstandingV1 = require("ibm-watson/natural-language-understanding/v1");
const naturalLanguageUnderstanding = new NaturalLanguageUnderstandingV1({
  version: "2021-08-01",
  authenticator: new IamAuthenticator({
    apikey: "j-QzH5knllRhv4qqJ4bnytNJAtNtSvohef66NVq1FnGL",
  }),
  serviceUrl:
    "https://api.eu-gb.natural-language-understanding.watson.cloud.ibm.com/instances/0c53e7a3-490f-4575-ad3a-f7f4e6f5b5af",
});
const languageTranslator = new LanguageTranslatorV3({
  version: "2018-05-01",
  authenticator: new IamAuthenticator({
    apikey: "HO6adpl0I9ATzGPKFomNQPbyLk3FeIwhXAQLs7YrXRPq",
  }),
  serviceUrl:
    "https://api.eu-gb.language-translator.watson.cloud.ibm.com/instances/19e791c9-c5d1-4526-878c-691a80b136fe",
});
const speechToText = new SpeechToTextV1({
  authenticator: new IamAuthenticator({
    apikey: "XCt0i5eh6uZF3QRjGGueKb85RrMs8Gye6BKK1sAYg33J",
  }),
  serviceUrl:
    "https://api.eu-gb.speech-to-text.watson.cloud.ibm.com/instances/625a1aa2-3542-45e9-aee1-b636e20e3156",
  // disableSslVerification: true,
});
mongoose.connect(
  "mongodb+srv://kianahs:kiana1378@festivaldb.itewc.mongodb.net/moviesFestival?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
var moviesSchema = require(__dirname + "/movies.js");
var commentsSchema = require(__dirname + "/comments.js");

app.listen(5000, function () {
  console.log("SERVER STARTS......");
});

app.set("view engine", "ejs");
app.use(
  express.json({
    limit: "",
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
    limit: "",
  })
);

app.get("/", function (request, response) {
  moviesSchema.find({}).exec(function (error, result) {
    // response.json(result);
    response.render("index", { result: result });
  });
});

app.get("/:movieId/comments/:lang", function (request, response) {
  commentsSchema.find({}).exec(function (error, result) {
    filtered_comments = result.filter((comment) => {
      if (comment.movie_id == request.params.movieId) return comment;
    });
    // console.log(typeof filtered_comments[0]);
    var allComments = filtered_comments.map((comment) => {
      // console.log(comment["content"]);
      return comment["content"];
    });
    const translateParams = {
      text: allComments,
      modelId: "en-" + request.params.lang,
    };

    languageTranslator
      .translate(translateParams)
      .then((translationResult) => {
        console.log(JSON.stringify(translationResult, null, 2));
        // response.json(result);
        var translated;
        translated = filtered_comments.map((element, index) => {
          const newElement = {
            _id: element["_id"],
            id: element["id"],
            movie_id: element["movie_id"],
            username: element["username"],
            content:
              translationResult["result"]["translations"][index]["translation"],
            __v: element["__v"],
          };
          // console.log(newElement);
          return newElement;
        });

        // console.log(translated);

        response.render("movieComments", { result: translated });
      })
      .catch((err) => {
        console.log("error:", err);
      });
  });
});

app.get("/:movieId/newCommentForm", function (request, response) {
  response.render("commentForm", { movieId: request.params.movieId });
});

app.get("/:movieId/chooseLang", function (request, response) {
  response.render("lang", { movieId: request.params.movieId });
});

app.get("/:movieId/showComments", function (request, response) {
  commentsSchema.find({}).exec(function (error, result) {
    filtered_comments = result.filter((comment) => {
      if (comment.movie_id == request.params.movieId) return comment;
    });

    response.render("movieComments", { result: filtered_comments });
  });
});

app.get("/test", (req, res) => {
  res.send(`
    <h2>With <code>"express"</code> npm package</h2>
    <form action="/api/upload" enctype="multipart/form-data" method="post">
      <div>Text field title: <input type="text" name="title" /></div>
      <div>File: <input type="file" name="someExpressFiles" multiple="multiple" /></div>
      <input type="submit" value="Upload" />
    </form>
  `);
});

app.post("/api/upload", (req, res, next) => {
  const form = formidable({
    multiples: true,
    uploadDir: __dirname + "/voiceComments",
  });

  form.parse(req, (err, fields, files) => {
    console.log(files.someExpressFiles.path, files.someExpressFiles.name);
    fs.rename(
      files.someExpressFiles.path,
      form.uploadDir + "/" + files.someExpressFiles.name,
      function (err, data) {
        console.log(err, data);
      }
    );

    if (err) {
      next(err);
      return;
    }
    res.json({ fields, files });
  });
});

app.post("/:movieId/addComment", async function (request, response, next) {
  var commentCounter = 0;
  commentsSchema.find({}).exec(function (error, result) {
    console.log(request.params);
    filtered_comments = result.filter((comment) => {
      if (comment.movie_id == request.params.movieId) return comment;
    });

    commentCounter = filtered_comments.length;
    const form = formidable({
      multiples: true,
      uploadDir: __dirname + "/voiceComments",
    });
    console.log(request.params);
    form.parse(request, async (err, fields, files) => {
      // console.log(files.content.path, files.content.name, fields);
      fs.rename(
        files.content.path,
        form.uploadDir + "/" + files.content.name,
        function (err, data) {
          console.log(err, data);
        }
      );

      if (err) {
        next(err);
        return;
      }
      // res.json({ fields, files });

      const params = {
        objectMode: true,
        contentType: "audio/" + fields.audioType,
        model: "en-US_BroadbandModel",
        maxAlternatives: 1,
      };

      // Create the stream.
      const recognizeStream = speechToText.recognizeUsingWebSocket(params);

      // Pipe in the audio.
      // console.log(fields.content, typeof fields.content);
      // const adr = request.params.content.toString

      // console.log(__dirname + "/voiceComments/" + files.content.name);
      await sleep(5000);
      fs.createReadStream(
        __dirname + "/voiceComments/" + files.content.name
      ).pipe(recognizeStream);
      // audioFile.pipe(recognizeStream);
      recognizeStream.on("data", function (event) {
        console.log(JSON.stringify(event, null, 2));
        // console.log(typeof event);
        const analyzeParams = {
          features: {
            keywords: {
              emotion: true,
              sentiment: true,
              limit: 1,
            },
          },
          text: event["results"][0]["alternatives"][0]["transcript"],
        };
        console.log(request.params);

        naturalLanguageUnderstanding
          .analyze(analyzeParams)
          .then((analysisResults) => {
            console.log(JSON.stringify(analysisResults, null, 2));
            if (
              analysisResults["result"]["keywords"][0]["emotion"]["anger"] < 0.6
            ) {
              const newComment = new commentsSchema({
                id: commentCounter + 1,
                movie_id: request.params.movieId,
                username: fields.username,
                content: event["results"][0]["alternatives"][0]["transcript"],
              });

              newComment.save();
            }
            commentsSchema.find({}).exec(function (error, res) {
              updated_filtered_comments = res.filter((comment) => {
                if (comment.movie_id == request.params.movieId) return comment;
              });

              response.render("movieComments", {
                result: updated_filtered_comments,
              });
            });
          })
          .catch((err) => {
            console.log("error:", err);
          });
      });
      recognizeStream.on("error", function (event) {
        console.log(JSON.stringify(event, null, 2));
        response.sendStatus(400);
      });
      recognizeStream.on("close", function (event) {
        console.log(JSON.stringify(event, null, 2));
      });
    });
  });
});

// app.post("/:movieId/addComment", async function (request, response) {
//   var commentCounter = 0;
//   commentsSchema.find({}).exec(function (error, result) {
//     filtered_comments = result.filter((comment) => {
//       if (comment.movie_id == request.params.movieId) return comment;
//     });
//     // response.json(result);
//     // console.log(filtered_comments);
//     // console.log(request.body.audioType);
//     commentCounter = filtered_comments.length;
//     const params = {
//       objectMode: true,
//       contentType: "audio/" + request.body.audioType,
//       model: "en-US_BroadbandModel",
//       maxAlternatives: 1,
//     };

//     // Create the stream.
//     const recognizeStream = speechToText.recognizeUsingWebSocket(params);

//     // Pipe in the audio.
//     // console.log(request.body.content, typeof request.body.content);
//     // const adr = request.params.content.toString
//     fs.createReadStream(
//       __dirname + "/voiceComments/" + request.body.content
//     ).pipe(recognizeStream);
//     // audioFile.pipe(recognizeStream);
//     recognizeStream.on("data", function (event) {
//       console.log(JSON.stringify(event, null, 2));
//       // console.log(typeof event);
//       const analyzeParams = {
//         features: {
//           keywords: {
//             emotion: true,
//             sentiment: true,
//             limit: 1,
//           },
//         },
//         text: event["results"][0]["alternatives"][0]["transcript"],
//       };

//       naturalLanguageUnderstanding
//         .analyze(analyzeParams)
//         .then((analysisResults) => {
//           console.log(JSON.stringify(analysisResults, null, 2));
//           if (
//             analysisResults["result"]["keywords"][0]["emotion"]["anger"] < 0.6
//           ) {
//             const newComment = new commentsSchema({
//               id: commentCounter + 1,
//               movie_id: request.params.movieId,
//               username: request.body.username,
//               content: event["results"][0]["alternatives"][0]["transcript"],
//             });

//             newComment.save();
//           }
//           commentsSchema.find({}).exec(function (error, res) {
//             updated_filtered_comments = res.filter((comment) => {
//               if (comment.movie_id == request.params.movieId) return comment;
//             });

//             response.render("movieComments", {
//               result: updated_filtered_comments,
//             });
//           });
//         })
//         .catch((err) => {
//           console.log("error:", err);
//         });
//     });
//     recognizeStream.on("error", function (event) {
//       console.log(JSON.stringify(event, null, 2));
//       response.sendStatus(400);
//     });
//     recognizeStream.on("close", function (event) {
//       console.log(JSON.stringify(event, null, 2));
//     });
//   });
// });
