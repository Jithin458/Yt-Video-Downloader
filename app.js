const express = require("express");
const mongoose = require("mongoose");
const ytdl = require("@distube/ytdl-core");
const crypto = require('crypto');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
mongoose.connect('connect url');

const videoSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
  hash: { type: String, required: true, unique: true },
  count:{type:Number,default:0},
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600 
  }
});
const cacheSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
  hash: { type: String, required: true, unique: true },
  count:{type:Number,default:0},
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 86400
  }
});
const Video = mongoose.model("Video",videoSchema);
const Cache = mongoose.model("Cache",cacheSchema);

function generateHashFromChunks(chunks) {
  const hash = crypto.createHash('sha256');
  for (const chunk of chunks) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

app.post("/download",async(req,res)=>{
let  videoId;
let c;
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
    const hash = generateHashFromChunks(chunks);
    const existing = await Video.findOne({ hash });
    if (!existing){
       const video = new Video({
        data:buffer,
        contentType:"video/mp4",
        hash:hash
   });
   
   await video.save();
   videoId = video._id;
    }else{
      videoId = existing._id;
    }
  
  console.log(videoId );
  res.redirect(`/download/${videoId}`);

}catch(err){
 console.error(err);
    res.status(500).send('Server error');
}});

app.get("/download/:id",async(req,res)=>{
    try {
    let video;
    let cache;
    const videoId = req.params.id;
    cache = await Cache.findById(videoId);
    if (cache){
        video = cache;
    }else{
       video = await Video.findByIdAndUpdate(videoId,
      {$inc:{count:1}},
      {new:true}  
    );
    if(video.count>=5){
      cache = new Cache({
              data: video.data,
              contentType: video.contentType,
              hash: video.hash,
              count: video.count
            });
      await cache.save();
      await Video.findByIdAndDelete(videoId);
      video = cache;
    }
    }
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