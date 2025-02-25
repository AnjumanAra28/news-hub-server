const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
    const reviewCollection = client.db("newsDB").collection("reviews");
    const faqCollection = client.db("newsDB").collection("faqs");

    // jwt related api
    // app.post("/jwt", async (req, res) => {
    //   const user = req.body;
    //   const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    //     expiresIn: "23h",
    //   });
    //   res.send({ token });
    //   console.log(token);
    // });

    // // // middlewares
    // const verifyToken = (req, res, next) => {
    //   if (!req.headers.authorization) {
    //     return res.status(401).send({ message: "unauthorized access" });
    //   }
    //   const token = req.headers.authorization.split(" ")[1];
    //   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //     if (err) {
    //       return res.status(401).send({ message: "unauthorized access" });
    //     }
    //     req.decoded = decoded;
    //     next();
    //   });
    // };

    // //  verifyToken
    // const verifyAdmin = async (req, res, next) => {
    //   const email = req.decoded.email;
    //   const query = { email: email };
    //   const user = await userCollection.findOne(query);
    //   const isAdmin = user?.role === "admin";
    //   if (!isAdmin) {
    //     return res.status(403).send({ message: "forbidden access" });
    //   }
    //   next();
    // };

    // check user is admin or not
    // app.get(
    //   "/users/admin/:email",

    //   async (req, res) => {
    //     const email = req.params.email;

    //     if (email !== req.decoded.email) {
    //       return res.status(403).send({ message: "forbidden access" });
    //     }

    //     const query = { email: email };
    //     const user = await userCollection.findOne(query);
    //     let admin = false;
    //     if (user) {
    //       admin = user?.role === "admin";
    //     }
    //     res.send({ admin });
    //   }
    // );

    //  get article
    app.get("/articles", async (req, res) => {
      const result = await articleCollection
        .find()
        .sort({ views: -1 })
        .limit(6)
        .toArray();
      res.send(result);
    });

    // get reviews on homepage
    app.get("/reviews", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });

    // get faqs on homepage
    app.get("/faqs", async (req, res) => {
      const result = await faqCollection.find().toArray();
      res.send(result);
    });

    // add articles to db
    app.post("/articles", async (req, res) => {
      const article = req.body;

      const user = await userCollection.findOne({ email: article.authorEmail });

      if (!user.premiumTaken) {
        const existingArticles = await articleCollection.countDocuments({
          authorEmail: article.authorEmail,
        });

        if (existingArticles > 0) {
          return res
            .status(403)
            .json({
              message:
                "Normal users can only post one article. Upgrade to premium!",
            });
        }
      }

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
    app.patch("/allArticles/:id/views", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $inc: { views: 1 },
      };
      const result = await articleCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // premium page article apis
    // get premium articles
    app.get("/premiumArticles", async (req, res) => {
      const result = await articleCollection
        .find({ isPremium: true })
        .toArray();
      res.send(result);
    });

    // my article page apis
    // get my article
    app.get("/myArticles/:email", async (req, res) => {
      const email = req.params.email;

      const filter = { authorEmail: email };

      const result = await articleCollection.find(filter).toArray();
      res.send(result);
    });

    // delete from my article
    app.delete("/myArticles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollection.deleteOne(query);
      res.send(result);
    });

    // get data for updating
    app.get("/myArticles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollection.findOne(query);
      res.send(result);
    });

    // update my article
    app.put("/updateMyArticle/:id", async (req, res) => {
      const id = req.params.id;
      const updatedArticle = req.body;
      const filter = { _id: new ObjectId(id) };

      const updatedDoc = {
        $set: {
          title: updatedArticle.title,
          description: updatedArticle.description,
        },
      };

      const result = await articleCollection.updateOne(filter, updatedDoc);
      res.send(result);
    });

    // dashboard apis
    // get all articles on admin route
    app.get(
      "/allArticles/admin/pieCharts",
      async (req, res) => {
        const result = await articleCollection.find().toArray();
        res.send(result);
      }
    );

    app.get("/allArticles/admin", async (req, res) => {
      console.log(req.query);
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
    
        if (page <= 0 || limit <= 0) {
          return res.status(400).json({ message: "Invalid page or limit" });
        }
    
        const skip = (page -1) * limit;
    
        const result = await articleCollection
          .find()
          .skip(skip)
          .limit(limit)
          .toArray();
    
        const totalArticles = await articleCollection.countDocuments();
    
        res.send({
          articles: result,
          totalArticles,
        });
      } catch (error) {
        console.error("Error fetching articles:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
      }
    });
    

    

    app.patch("/allArticles/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updatedDoc = {
        $set: {
          status: "approved",
        },
      };
      const result = await articleCollection.updateOne(filter, updatedDoc);

      if (result.modifiedCount > 0) {
        res.status(200).json({ message: "Article status updated to approved" });
      } else {
        res.status(400).json({ message: "Failed to update article status" });
      }
    });

    // update article status to approve
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

    // delete from all article admin route
    app.delete("/allArticles/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await articleCollection.deleteOne(query);
      res.send(result);
    });

    // get logged in user for updating data
    app.get("/user/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    // update user profile
    app.put("/updateUser/:email", async (req, res) => {
      const email = req.params.email;
      const { name, photo } = req.body;
      const query = { email: email };
      const updateDoc = {
        $set: { name: name, photo: photo },
      };

      const result = await userCollection.updateOne(query, updateDoc);
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

    //  load all users --- dashboard api
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // make user admin --- dashboard api
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

    // user statistics
    app.get("/user-stats", async (req, res) => {
      try {
        const totalUsers = await userCollection.countDocuments();
        const premiumUsers = await userCollection.countDocuments({
          premiumTaken: { $ne: null },
        });
        const normalUsers = totalUsers - premiumUsers;

        res.send({
          totalUsers,
          normalUsers,
          premiumUsers,
        });
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch statistics" });
      }
    });

    // subscription api
    app.put("/premiumUser/:email", async (req, res) => {
      const { selectedDuration } = req.body; // Updated variable name
      const email = req.params.email;

      const filter = { email: email };
      let expiryDate = new Date();

      if (selectedDuration === "1 minute") {
        expiryDate.setMinutes(expiryDate.getMinutes() + 1);
      } else if (selectedDuration === "5 days") {
        expiryDate.setDate(expiryDate.getDate() + 5);
      } else if (selectedDuration === "10 days") {
        expiryDate.setDate(expiryDate.getDate() + 10);
      }

      const updateDoc = {
        $set: { premiumTaken: expiryDate },
      };

      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    // check a user is premium
    app.get("/checkPremium/:email", async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email });

      if (user?.premiumTaken) {
        const currentTime = new Date();
        const premiumExpiry = new Date(user.premiumTaken);

        if (currentTime > premiumExpiry) {
          await userCollection.updateOne(
            { email },
            { $set: { premiumTaken: null } }
          );
          return res.send({ premium: false });
        } else {
          return res.send({ premium: true });
        }
      }
      res.send({ premium: false });
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
