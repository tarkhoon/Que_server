const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const fileUploader = require("express-fileupload");
const axios = require("axios");
const fs = require("fs");
const bodyParser = require("body-parser");
const events = require("events");

const emitter = new events.EventEmitter();

const app = express();

app.use(
  bodyParser.urlencoded({ limit: "5mb", extended: true })
);
app.use(bodyParser.json({ limit: "5mb" }));
app.use(bodyParser.raw({ limit: "5mb" }));
app.use(cors());
app.use(fileUploader());
app.use(express.json());

const config = {
  host: "rc1b-cqxyadfgfuarcq3e.mdb.yandexcloud.net",
  port: 3306,
  user: "default-user",
  password: "default-user",
  database: "que",
  ssl: {
    rejectUnauthorized: true,
    ca: fs
      .readFileSync("/home/bilyash/.mysql/root.crt")
      .toString(),
  },
};

const conn = mysql.createConnection(config);

conn.connect((err) => {
  if (err) {
    console.log(err);
  } else {
    console.log("db connected");
  }
});

app.get("/like/:user/:postId", (req, res) => {
  const user = req.params.user;
  const postId = req.params.postId;
  var post;
  conn.query(
    `select * from Posts where id = ${postId}`,
    function (error, results, fields) {
      post = results[0];
      if (error) {
        console.log(error);
        res.status(500);
      } else {
        emitter.emit(`newMessage:${post.userId}`, ["like",postId,user.userId]);
        console.log(post.likes);
        conn.query(
          `update Posts set likes = ${
            post.likes + 1
          } where id = ${postId}`,
          function (error, results, fields) {
            if (error) {
              console.log(error);
              res.status(500);
            } else {
              console.log(results);
              res.json(results);
            }
          }
        );
      }
    }
  );
});
app.get("/unlike/:usId/:postId", (req, res) => {
  const user = req.params.usId;
  const postId = req.params.postId;
  var post;
  conn.query(
    `select * from Posts where id = ${postId}`,
    function (error, results, fields) {
      post = results[0];

      if (error) {
        console.log(error);
        res.status(500);
      } else {
        console.log(post.likes);
        conn.query(
          `update Posts set likes = ${
            post.likes - 1
          } where id = ${postId}`,
          function (error, results, fields) {
            if (error) {
              console.log(error);
              res.status(500);
            } else {
              console.log(results);
              res.json(results);
            }
          }
        );
      }
    }
  );
});
app.get("/connect/:id", (req, res) => {
  const connID = req.params.id;
  res.writeHead(200, {
    Connection: "keep-alive",
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
  });
  emitter.on(`newMessage:${connID}`, (message) => {
    res.write(`data: ${JSON.stringify(message)} \n\n`);
  });
});
app.post("/new-messages/:id", (req, res) => {
  const objectID = req.params.id;
  const message = req.body;
  emitter.emit(`newMessage:${objectID}`, message);
  res.status(200);
});
app.get("/photo", (req, res) => {
  conn.query(
    "SELECT * FROM Posts",
    function (error, results, fields) {
      res.json(results);
      console.log(results);
      console.log(error);
    }
  );
});
app.post("/upload", (req, res) => {
  (async () => {
    try {
      const photo = req.files.image;

      photo.mv("/home/bilyash/que/" + photo.md5 + ".jpg");

      const uploadUrl =
        `http://storage.yandexcloud.net/questorage/` +
        photo.md5 +
        ".jpg";
      const response = await axios.put(
        uploadUrl,
        fs.createReadStream(
          "/home/bilyash/que/" + photo.md5 + ".jpg"
        ),
        {}
      );

      console.log(
        "Файл успешно загружен:",
        response.status
      );
      if (response) {
        console.log(uploadUrl);
        res.send(uploadUrl);
      }
    } catch (e) {
      console.log(e);
      return res.status(500);
    }
  })();
});
app.post("/publicate", (req, res) => {
  try {
    //user,rate,description,restaurant,img_url
    var data = [
      req.body.user,
      req.body.rate,
      req.body.description,
      req.body.restaurant,
      req.body.img_url,
    ];
    conn.query(
      `INSERT INTO Posts (id, username, restaurant_name, img_uri, rate, description, likes, comms, saves) VALUES (0,'${data[0]}','${data[3]}','${data[4]}','${data[1]}','${data[2]}',0,0,0)`,
      function (error, results, fields) {
        res.json(results);
        console.log(results);
        console.log(error);
      }
    );
  } catch (e) {
    return e;
  }
});
app.post("/register", (req, res) => {
  try {
    var data = req.body;
    console.log(data);
    if (data.isRestaurant) {
      conn.query(
        `INSERT INTO Restaurants VALUES (0,'${data.name}','${data.nickname}','${data.email}')`,
        function (error, results, fields) {
          res.json(results);
          console.log("error");
          console.log(error);
          console.log("res");
          console.log(results);
        }
      );
    } else {
      conn.query(
        `INSERT INTO Users VALUES (0,'${data.name}','${data.nickname}','${data.email}')`,
        function (error, results, fields) {
          res.json(results);
          console.log("error");
          console.log(error);
          console.log("res");
          console.log(results);
        }
      );
    }
  } catch (e) {
    res.send(e);
  }
});

app.get("/getUserInfo/:email", (req, res) => {
  var email = req.params.email;
  conn.query(
    `select name, nickname from Restaurants where email = '${email}'`,
    function (error, results, fields) {
      var response = [];
      if(results){
        console.log(results)
        response[0] = results[0];
        conn.query(
          `select * from Posts where username = '${email}'`,
          function (error, results, fields) {
            if(results){
                response[1] = results;
                res.json(response);
            }
          }      
        );
        console.log(response)
        res.json(response);
      }else console.log(error)
    }
  );
  conn.query(
    `select name, nickname from Users where email = '${email}'`,
    function (error, results, fields) {
      var response = [];
      if(results){
        response[0] = results[0];
        conn.query(
          `select * from Posts where username = '${email}'`,
          function (error, results, fields) {
            if(results){
                response[1] = results;
                res.json(response);
            }
          }
        );

      }else{
        console.log(error)
      res.status(404);
      }
    }
  );
});

app.post("/comm", (req, res) => {
  try {
    //user,rate,description,restaurant,img_url
    var data = [
      req.body.postId,
      req.body.description,
      req.body.user
    ];
    conn.query(
      `INSERT INTO Comms VALUES (0,'${data[0]}','${data[1]}','${data[2]}')`,
      function (error, results, fields) {
        res.json(results);
        console.log(results);
        console.log(error);
      }
    );
  } catch (e) {
    return e;
  }
});

app.listen(4000, () => {
  console.log("Сервер запущен на порту: 4000");
});
