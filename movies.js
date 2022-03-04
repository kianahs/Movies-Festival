const mongoose = require("mongoose");
mongoose.connect(
  "mongodb+srv://kianahs:kiana1378@festivaldb.itewc.mongodb.net/moviesFestival?retryWrites=true&w=majority",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

const moviesSchema = new mongoose.Schema({
  id: {
    type: "Number",
  },
  name: {
    type: "String",
  },
  poster_url: {
    type: "String",
  },
  director: {
    type: "String",
  },
});

module.exports = mongoose.model("movies", moviesSchema);
