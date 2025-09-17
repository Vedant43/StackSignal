import { Router } from "express";
import { signUpClient, loginClient } from "../../controller/auth/clientAuth.controller.js";
const router = Router();

router.post("/signup", signUpClient);
router.post("/login", loginClient);

export default router;