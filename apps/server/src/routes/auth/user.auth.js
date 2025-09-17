import { Router } from "express";
import { signUpUser, loginUser } from "../../controller/auth/userAuth.controller.js";

const router = Router();

router.post("/signup", signUpUser);
router.post("/login", loginUser);

export default router;