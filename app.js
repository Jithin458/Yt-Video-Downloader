const express = require("express");
const mongoose = require("mongoose");
const ytdl = require("@distube/ytdl-core");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
mongoose.connect('connect url');

const videoSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 
  }
});
const Video = mongoose.model("Video",videoSchema);

app.post("/download",async(req,res)=>{
const url = req.body.url;
const q = req.body.quality;
if(!ytdl.validateURL(url)){
    return res.status(400).send("Invalid Youtube url");
}
try{
   const videoStream =  ytdl(url,{quality:q});
   const chunks=[];
   const buffer = await new Promise((resolve,reject)=>{
  videoStream.on('data',chunk=>chunks.push(chunk));
   videoStream.on('end',()=>{
    resolve(Buffer.concat(chunks));
   })
    videoStream.on('error', (err) => {
   reject(err);
   })
   })
    const video = new Video({
    data:buffer,
    contentType:"video/mp4"
   });
   await video.save();
   console.log(video._id );
  res.redirect(`/download/${video._id}`);

}catch(err){
 console.error(err);
    res.status(500).send('Server error');
}});

app.get("/download/:id",async(req,res)=>{
    try {
    const video = await Video.findById(req.params.id);
    if(!video){
        return res.status(400).send("Video not found");
    }
    res.set({
  'Content-Type': video.contentType,
  'Content-Length': video.data.length
});

    res.send(video.data);

    } catch (err) {
        res.status(500).send('Error fetching video');
    }
})

  app.listen(3000,()=>{
    console.log("Server is running....");
  })