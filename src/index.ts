import Express, { Request } from "express"
import bodyParser from "body-parser";
import cors from "cors"
import Database from "./Database";
import path from "path";
import formidable from 'formidable';
import { v4 as uuidv4 } from 'uuid';
import sha256, { Hash, HMAC } from "fast-sha256";
var nacl = require('tweetnacl');
nacl.util = require('tweetnacl-util');


const app = Express();
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cors({
    origin: "*",
    credentials: true,
}))
app.use("/static", Express.static('public'));


const database = new Database();

app.post("/register", async (req: Request<{}, {}, { username: string, password: string }>, res) => {
    // Check if user exists
    const getUserResult = await database.getUserId(req.body.username)
    if (getUserResult.success === false || getUserResult.data.length === 1) {
        return res.status(400).send({ description: "User already exists" });
    }

    // Check if username isn't too long
    if (req.body.username.length > 30) {
        return res.status(400).send({ description: "Username over 30 characters" })
    }

    // Register
    let uintPass = nacl.util.decodeUTF8(req.body.password);
    let shaPasswd = sha256(uintPass)
    let stringPasswd = new TextDecoder().decode(shaPasswd);

    const registerResult = await database.register(
        uuidv4(),
        req.body.username,
        stringPasswd,
    )
    if (registerResult.success === false) {
        return res.status(400).send({ description: "Registration error occured" });
    }

    return res.status(200).send({ description: "Registration successful" });
})

app.post("/login", async (req: Request<{}, {}, { username: string, password: string }>, res) => {
    let uintPass = nacl.util.decodeUTF8(req.body.password)
    let shaPasswd = sha256(uintPass)
    let stringPasswd = new TextDecoder().decode(shaPasswd);

    const result = await database.login(
        req.body.username,
        stringPasswd,
    )

    if (result.success === false || result.data.length !== 1) {
        return res.status(400).send({ description: "Wrong login data" });
    }

    return res.status(200).send({
        description: "Successful login",
        id: result.data[0].id,
        username: req.body.username
    });
})


app.post("/getUserData", async (req: Request<{}, {}, { id: string }>, res) => {
    // Single data
    const resultSingle = await database.getSingleData(req.body.id)
    if (resultSingle.success === false || resultSingle.data.length !== 1) {
        console.log(resultSingle)
        return res.status(400).send({ description: "Get single data error" });
    }
    // Skills
    const resultSkills = await database.getSkills(req.body.id)
    if (resultSkills.success === false) {
        return res.status(400).send({ description: "Get skills data error" });
    }
    // Achievements
    const resultAchievements = await database.getAchievements(req.body.id)
    if (resultAchievements.success === false) {
        return res.status(400).send({ description: "Get achievements data error" });
    }

    return res.status(200).send({
        description: "Get data successful",
        data: {
            single: resultSingle.data,
            skills: resultSkills.data,
            achievements: resultAchievements.data
        }
    });
})

app.get("/getUserData", async (req: Request<{}, {}, { username: string }>, res) => {
    const resultUserId = await database.getUserId(req.body.username)
    if (resultUserId.success === false || resultUserId.data.length !== 1) {
        console.log(resultUserId)
        return res.status(400).send({ description: "User doesn't exist" });
    }

    // Single data
    const resultSingle = await database.getSingleData(resultUserId.data[0].id)
    if (resultSingle.success === false || resultSingle.data.length !== 1) {
        console.log(resultSingle)
        return res.status(400).send({ description: "Get single data error" });
    }
    // Skills
    const resultSkills = await database.getSkills(resultUserId.data[0].id)
    if (resultSkills.success === false) {
        return res.status(400).send({ description: "Get skills data error" });
    }
    // Achievements
    const resultAchievements = await database.getAchievements(resultUserId.data[0].id)
    if (resultAchievements.success === false) {
        return res.status(400).send({ description: "Get achievements data error" });
    }

    return res.status(200).send({
        description: "Get data successful",
        data: {
            single: resultSingle.data,
            skills: resultSkills.data,
            achievements: resultAchievements.data
        }
    });
})

app.post("/addQuiz", async (req: Request<{}, {}, { category: number, name: string, questionCount: number, reward: number }>, res) => {
    const result = await database.addQuiz(req.body.category, req.body.name, req.body.questionCount, req.body.reward)
    if (result.success === false) {
        console.log(result)
        return res.status(400).send({ description: "Error adding the quiz" });
    }

    return res.status(200).send({ description: "Successfully added a quiz" });
})

app.post("/addQuestion", async (req: Request<{}, {}, { quizId: string, question: string }>, res) => {
    const result = await database.addQuestion(req.body.quizId, req.body.question)
    if (result.success === false) {
        console.log(result)
        return res.status(400).send({ description: "Error adding the question" });
    }

    return res.status(200).send({ description: "Successfully added a question" });
})

app.post("/addAnswer", async (req: Request<{}, {}, { questionId: number, answer: string, correct: boolean }>, res) => {
    const result = await database.addAnswer(req.body.questionId, req.body.answer, req.body.correct)
    if (result.success === false) {
        console.log(result)
        return res.status(400).send({ description: "Error adding an answer" });
    }

    return res.status(200).send({ description: "Successfully added an answer" });
})

app.get("/getCategories", async (req: Request<{}, {}, {}>, res) => {
    const result = await database.getAvailableCategories()
    if (result.success === false || result.data.length === 0) {
        console.log(result)
        return res.status(400).send({ description: "Error loading available categories" });
    }

    return res.status(200).send({
        description: "Success getting categories",
        data: result.data
    });
})

app.get("/getQuizes", async (req: Request<{}, {}, {}>, res) => {
    const result = await database.getAvailableQuizes()
    if (result.success === false || result.data.length === 0) {
        console.log(result)
        return res.status(400).send({ description: "Error loading available quizes" });
    }

    return res.status(200).send({
        description: "Success getting quizes",
        data: result.data
    });
})

app.get("/getQuestions", async (req: Request<{}, {}, {}>, res) => {
    const result = await database.getAvailableQuestions()
    if (result.success === false || result.data.length === 0) {
        console.log(result)
        return res.status(400).send({ description: "Error loading available questions" });
    }

    return res.status(200).send({
        description: "Success getting questions",
        data: result.data
    });
})

app.get("/", (_, res) => {
    res.send("Hello world!");
})

app.get("/fileUpload", (_, res) => {
    let text = ""
    text += '<form action="file" method="POST" enctype="multipart/form-data">'
    text += '<input type="file" name = "filetoupload"> <br>'
    text += '<input type="submit">'
    text += '</form>'
    res.send(text);
})

app.post("/file", (req, res) => {
    const form = new formidable.IncomingForm();
    form.parse(req)

    const id = uuidv4();
    let extension = "";
    let originalName = "";

    form.on('fileBegin', (name, file) => {
        const splitted = file.originalFilename!.split(".")
        extension = splitted.at(-1)!
        originalName = splitted.splice(0, splitted.length - 1).join(".")
        file.filepath = __dirname + '/uploads/' + id + "." + extension;
    });

    form.on('file', async (name, file) => {
        const result = await database.addFileInfo(id, extension, originalName!);

        if (result.success === false) {
            return res.status(500).send();
        }

        console.log(`Uploaded ${file.originalFilename} as ${id}.${extension} extension'`);
        return res.send();
    });
})

app.get("/file", async (req: Request<{}, {}, { id: string }>, res) => {
    if (typeof req.query.id != "string") {
        return res.status(400).send({ description: "id musi być stringiem" });
    }

    const fileInfo = await database.getFileInfo(req.query.id)
    if (fileInfo.success === false) {
        return res.status(400).send({ description: "Brak takiego pliku" });
    }

    const file = __dirname + '/uploads/' + req.query.id + "." + fileInfo.data[0].extension;
    const downloadName = fileInfo.data[0].originalName + '.' + fileInfo.data[0].extension;
    console.log("zwracam plik " + file + " jako " + downloadName)
    return res.download(file, downloadName);
})

app.get("/allPdfs", async (_, res) => {
    const files = await database.getAllPdfs()
    if (files.success === false) {
        return res.status(400).send({ description: "Błąd pobierania wszystkich pdfów" });
    }
    return res.send(files)
})

app.listen(3000, () => {
    console.log("Listening on 3000");
})