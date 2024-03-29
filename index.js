const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors')
const jwt = require('jsonwebtoken')
require('dotenv').config()
const port = process.env.PORT || 5000;

const app = express()

// middleware
app.use(cors())
app.use(express.json())

// mongodb database using

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yaydkop.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
  console.log('token inside verify jwt', req.headers.authorization)
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send('unauthorized access');

  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'forbiden access' })
    }
    req.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    const appointmentOptionsCollection = client.db('DoctorsPortal').collection('appoinmentOptions');
    const bookingsCollection = client.db('DoctorsPortal').collection('bookings');
    const usersCollection = client.db('DoctorsPortal').collection('users');


    app.get('/appointmentoptions', async (req, res) => {
      const date = req.query.date;
      console.log(date);
      const query = {};
      const options = await appointmentOptionsCollection.find(query).toArray();

      const bookingQuery = { appointmentDate: date }
      const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray();


      options.forEach(option => {
        const optionBooked = alreadyBooked.filter(book => book.treatment === option.name);
        const bookedSlots = optionBooked.map(book => book.slot);
        const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
        option.slots = remainingSlots
      })
      res.send(options);

    })

    app.get('/booking', verifyJWT, async (req, res) => {
      const email = req.query.email;
      const decodeEmail = req.decoded.email;
      console.log(decodeEmail);

      if (email !== decodeEmail) {
        return res.status(403).send({ message: 'forbiden access' })
      }
      const query = { email: email };
      const bookings = await bookingsCollection.find(query).toArray();
      res.send(bookings);
    })
    app.get('/allappointments', async (req, res) => {
      const query = {}
      const allappointments = await bookingsCollection.find(query).toArray();
      res.send(allappointments)
    })


    app.get('/jwt', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      if (user) {
        const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '360d' })
        return res.send({ accessToken: token })
      }

      res.status(403).send({ accessToken: "" })
    })
    app.post('/booking', async (req, res) => {
      const booking = req.body
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    })

    app.get('/users', async (req, res) => {
      const query = {}
      const users = await usersCollection.find(query).toArray();
      res.send(users)
    })


    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result);
    })

    app.put('/users/admin/:id', verifyJWT, async (req, res) => {

      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'You are not admin. Only admin can make admin.' })
      }


      const id = req.params.id;
      const filter = { _id: ObjectId(id) }
      const options = { upsert: true };
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await usersCollection.updateOne(filter, updatedDoc, options)
      res.send(result)
    })
    app.delete('/allappointments/:id', verifyJWT, async (req, res) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== 'admin') {
        return res.status(403).send({ message: 'Only admin can delete this item.' })
      }
      const { id } = req.params
      const filter = { _id: ObjectId(id) }


      console.log(id);
      const result = await bookingsCollection.deleteOne(filter);
      res.send(result)

    })
  }
  finally {

  }
}
run().catch(console.log);

app.get('/', (req, res) => {
  res.send('hello doctors portal');
})


app.listen(port, () => {
  console.log('Doctors portals App in running ');
})