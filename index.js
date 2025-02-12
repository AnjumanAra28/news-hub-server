const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());


const uri =
  `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sucjx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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

   const articleCollection = client.db('newsDB').collection('articles')
   const publisherCollection = client.db('newsDB').collection('publisher')
   const userCollection = client.db('newsDB').collection('users')
   
    //  get article post
    app.get('/articles',async(req,res)=>{
       const result = await articleCollection.find().sort({ views: -1 }).limit(6).toArray()
       res.send(result)
    })

    // add articles to db
    app.post('/articles',async (req,res)=>{
      const article = req.body;
      const result = await articleCollection.insertOne(article);
      res.send(result)
    })

     //  get publisher 
     app.get('/publisher',async(req,res)=>{
      const result = await publisherCollection.find().toArray()
      res.send(result)
   })

  //  user api
  app.post('/users', async (req, res) => {
    const user = req.body;
    
    const query = { email: user.email }
    const existingUser = await userCollection.findOne(query);

    if (existingUser) {
      return res.send({ message: 'user already exists', insertedId: null })
    }
    const result = await userCollection.insertOne(user);
    res.send(result);
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


