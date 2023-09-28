const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + "/public/"));

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
}).then(() => {
  console.log("Connected to MongoDB");
}).catch((err) => {
  console.error("Error connecting to MongoDB:", err);
});

const itemsSchema = {
  name: String
};

const Item = mongoose.model("Item", itemsSchema);

const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit the + button to add a new item."
});

const item3 = new Item({
  name: "<-- Hit this to delete an item."
});

const defaultItems = [item1, item2, item3];

const listSchema = {
  name: String,
  items: [itemsSchema]
};

const List = mongoose.model("List", listSchema);

app.get("/", async (req, res) => {
  try {
    const foundItems = await Item.find({});
    if (foundItems.length === 0) {
      await Item.insertMany(defaultItems);
      console.log("Successfully saved default items to DB.");
      res.redirect("/");
    } else {
      res.render("list", { listTitle: "Today", newListItems: foundItems });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/:customListName", async (req, res) => {
  const customListName = _.capitalize(req.params.customListName);

  try {
    const foundList = await List.findOne({ name: customListName });
    if (!foundList) {
      const list = new List({
        name: customListName,
        items: defaultItems
      });
      await list.save();
      res.redirect("/" + customListName);
    } else {
      res.render("list", { listTitle: foundList.name, newListItems: foundList.items });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/", async (req, res) => {
  const itemName = req.body.newItem;
  const listName = req.body.list;

  const item = new Item({
    name: itemName
  });

  if (listName === "Today") {
    try {
      await item.save();
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    try {
      const foundList = await List.findOne({ name: listName });
      foundList.items.push(item);
      await foundList.save();
      res.redirect("/" + listName);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
});

app.post("/delete", async (req, res) => {
  const checkedItemId = req.body.checkbox;
  const listName = req.body.listName;

  if (listName === "Today") {
    try {
      await Item.findByIdAndRemove(checkedItemId);
      console.log("Successfully deleted checked item.");
      res.redirect("/");
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  } else {
    try {
      await List.findOneAndUpdate({ name: listName }, { $pull: { items: { _id: checkedItemId } } });
      res.redirect("/" + listName);
    } catch (err) {
      console.error(err);
      res.status(500).send("Internal Server Error");
    }
  }
});

app.get("/about", (req, res) => {
  res.render("about");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
