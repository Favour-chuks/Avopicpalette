import * as mongoose from 'mongoose'

export const connectDB = async () => {
 const dbUri = process.env.DATABASE_URI
 try {
  await mongoose.connect(dbUri, {
   useUnifiedTopology: true,
   useNewUrlParser: true,
  })
 } catch (err) {
  console.error(err)
 }
}