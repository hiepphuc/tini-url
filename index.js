require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const app = express()
const PORT = 3000

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connected to MongoDB! 🍃'))
  .catch(err => console.error('Could not connect to MongoDB:', err));

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
})