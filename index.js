const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sucjx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const articleCollection = client.db("newsDB").collection("articles");
    const publisherCollection = client.db("newsDB").collection("publisher");
    const userCollection = client.db("newsDB").collection("users");

    //  get article post
    app.get("/articles", async (req, res) => {
      const result = await articleCollection
        .find()
        .sort({ views: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // add articles to db
    app.post("/articles", async (req, res) => {
      const article = req.body;
      const result = await articleCollection.insertOne(article);
      res.send(result);
    });

    // get all approved articles
    app.get("/allArticles", async (req, res) => {
      const { search, publisher, tag } = req.query;

      let filter = { status: "approved" };

      if (search) filter.title = { $regex: search, $options: "i" };
      if (publisher) filter.publisher = publisher;
      if (tag) filter.tags = tag;

      const result = await articleCollection.find(filter).toArray();
      res.send(result);
    });

    // get articleDetails
    app.get("/articleDetails/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const result = await articleCollection.findOne(filter);
      res.send(result);
    });

    // api for view count increase
    app.patch('/allArticles/:id/views', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
          $inc: { views: 1 }
      };
      const result = await articleCollection.updateOne(filter, updatedDoc);
      res.send(result);
  });
  

    // get all articles on admin route
    app.get("/allArticles/admin", async (req, res) => {
      const result = await articleCollection.find().toArray();
      res.send(result);
    });



    // update article status
    app.patch("/allArticles/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await articleCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // update article decline reason
    app.patch("/allArticles/:id/decline", async (req, res) => {
      const id = req.params.id;
      const { reason } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "declined",
          declineReason: reason,
        },
      };
      const result = await articleCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // update article to premium
    app.patch("/allArticles/:id/premium", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          isPremium: true,
        },
      };
      const result = await articleCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // delete article
    app.delete("/allArticles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollection.deleteOne(query);
      res.send(result);
    });

    //  get publisher
    app.get("/publisher", async (req, res) => {
      const result = await publisherCollection.find().toArray();
      res.send(result);
    });

    // add publisher
    app.post("/publisher", async (req, res) => {
      const publisherData = req.body;
      const result = await publisherCollection.insertOne(publisherData);
      res.send(result);
    });

    //  user api

    // save user on database
    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);

      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    //  load all users
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // make user admin
    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await userCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // delete user from database
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users/admin/:email", async (req, res) => {
      const email = req.params.email;

      // if (email !== req.decoded.email) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }

      const query = { email: email };
      const user = await userCollection.findOne(query);
      let admin = false;
      if (user) {
        admin = user?.role === "admin";
      }
      res.send({ admin });
    });

    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("news is running");
});

app.listen(port, () => {
  console.log(`news hub is running on port ${port}`);
});
