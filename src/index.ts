import "reflect-metadata";
require('dotenv-safe').config();
import express from "express";
import { createConnection } from "typeorm"; 
import { __prod__ } from "./constants";
import { join } from "path";
import { User } from "./entities/User";
import { Strategy as GitHubStrategy } from "passport-github";
import passport from "passport";
import { env } from "process";
import jwt from "jsonwebtoken";
import cors from "cors";

const main = async () => {
    // might need to set username and password
    await createConnection({
        type: 'postgres',
        database: 'snippetbox',
        username :'postgres',
        password: env.POSTGRES_PW,
        entities: [join(__dirname, './entities/*.*')],
        logging: !__prod__,
        synchronize: !__prod__,
    });
    
    // const user = await User.create({name: 'bob'}).save();
    // console.log({user});
    const app = express();
    passport.serializeUser((user: any, done) => {
        done(null, user.accessToken);
      });
    // app.use(cors({origin: "*" }));
    app.use(cors()); 
    // app.use((_req, res, next) => {
    //     res.header("Access-Control-Allow-Origin", "*");
    //     res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    //     next();
    // }) 
    app.use(passport.initialize());
    
    passport.use(new GitHubStrategy({
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: "http://localhost:3002/auth/github/callback"
      },
      async (_, __, profile, cb) => {
        // can use profile.id to tell if they've logged in before
        let user = await User.findOne({where: {githubId: profile.id}})
        if (user) {
            // User.update() can update user info partially
            user.name = profile.displayName // this is a way you can do it with typeorm
            await user.save()
        } else {
            user = await User.create({
                name: profile.displayName,
                githubId: profile.id
            }).save();
        }
        cb(null, {
            accessToken: jwt.sign(
                { userId: user.id}, 
                env.ACCESS_TOKEN, 
                {expiresIn: "1y"} )}); // could also have refresh token
      }
    ));

    app.get('/auth/github',
        passport.authenticate('github', {session: false}));

    app.get('/auth/github/callback',
        passport.authenticate('github', {session: false}), 
        (req: any, res) => {
            //correct even for PROD, will start local server on user's computer
            res.redirect(`http://localhost:54321/auth/${req.user.accessToken}`); 
        });
    
    app.get(`/me`, async (req, res) => {
        // has this format: Bearer 1232aldjshfkjgh
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            res.send({user: null});
            return;
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            res.send({user: null});
            return;
        }

        let userId = "";

        try {
            const payload: any = jwt.verify(token, env.ACCESS_TOKEN)
            userId = payload.userId;
        } catch (err) {
            res.send({user: null});
            return;
        }

        if (!userId) {
            res.send({ user: null });
            return;
        }

        const user = await User.findOne(userId);
        res.send({ user });
    })

    app.get('/', (_req, res) => {
        res.send("hello");
    });
    app.listen(3002, () => {
        console.log("listening on localhost:3002");
    });
};

main();