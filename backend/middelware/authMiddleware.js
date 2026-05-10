function auth(req,res,next){
  const token = req.headers.authorization;

  if(!token) return res.status(401);

  const decoded = jwt.verify(token, SECRET);

  req.user = decoded;
  next();
}