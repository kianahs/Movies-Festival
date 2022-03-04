const mongoose = require("mongoose");
mongoose.connect(
  "mongodb+srv://kianahs:kiana1378@festivaldb.itewc.mongodb.net/moviesFestival?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const commentsSchema = new mongoose.Schema({
  id: {
    type: "Number",
  },
  movie_id: {
    type: "Number",
  },
  username: {
    type: "String",
  },
  content: {
    type: "String",
  },
});

module.exports = mongoose.model("comments", commentsSchema);
