const express = require('express')
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors')
require('dotenv').config()
const port = process.env.PORT || 5000;

const app = express()

// middleware
app.use(cors())
app.use(express.json())

// mongodb database using

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.yaydkop.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
  try {
    const appointmentOptionsCollection = client.db('DoctorsPortal').collection('appoinmentOptions');
    const bookingsCollection = client.db('DoctorsPortal').collection('bookings');


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

    app.post('/bookings', async (req, res) => {
      const booking = req.body
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
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