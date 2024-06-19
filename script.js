const canvas = document.querySelector(".C")
const ctx = canvas.getContext("2d")

const bird_IMG = new Image();
bird_IMG.src = "./bird.png";

const bird_IMG_jump = new Image();
bird_IMG_jump.src = "./bird_jump.png";

Width = canvas.width = innerWidth * 0.99;
Height = canvas.height = innerHeight - 50;

let Score = 0;
window.gravity = 0.1;
function inputs(bird){
  if(pipes.length == 0){ return [1, 1]; }
  if(pipes[0].x < 150){
    return [pipes[1].x/10 - 15,pipes[1].h1/10,pipes[1].h2/10, bird.y/10]
  }
  return [pipes[0].x/10 - 15,pipes[0].h1/10,pipes[0].h2/10, bird.y/10]
}

class Network {
  Approx(v, K, lR, n, parent) {
    if(n){
      if(parent){
        return parent.NN[v].map(n_n => {
          return n_n.map(k => k+(2*Math.random()-1)*lR)
        })
      } else {
        return Array.from({ length: K }, () => Array.from({ length: K }, () => 2*Math.random()-1));
      }
    }
    if(parent){
      return parent.NN[v].map(n => n+(2*Math.random()-1)*lR)
    } else {
      return Array.from({ length: K }, () => 5*Math.random() - 2.5);
    }
  }
  constructor(parent, learnRate){
    this.parent = parent;
    // INPUT: pipe.x, pipe.h1, pipe.h2, this.y
    // 1 hidden layer - 3N
    // OUTPUT: Jump, stay
    this.W1 = this.Approx("W1", 4, learnRate, 1, parent);
    this.B2 = this.Approx("B2", 3, learnRate, null);
    this.W2 = this.Approx("W2", 3, learnRate, 1, parent);
    this.B3 = this.Approx("B3", 2, learnRate, null);
  }
  SmoothLeakyReLU(x) { return Math.log(1 + Math.exp(x)) }
  Sigmoid(x) { return 1 / (1 + Math.exp(-x)) }
  Sum(n){
    return n.reduce((p, a) => p + a, 0);
  }
  Calculate(inps) {
    let [a,b,c,d] = inps;
    const zHidden = [
      a * this.W1[0][0] + b * this.W1[1][0] + c * this.W1[2][0] + d * this.W1[3][0] + this.B2[0],
      a * this.W1[0][1] + b * this.W1[1][1] + c * this.W1[2][1] + d * this.W1[3][1] + this.B2[1],
      a * this.W1[0][2] + b * this.W1[1][2] + c * this.W1[2][2] + d * this.W1[3][2] + this.B2[2],
      a * this.W1[0][3] + b * this.W1[1][3] + c * this.W1[2][3] + d * this.W1[3][3] + this.B2[3]
    ];
    const hiddenActivations = zHidden.map(z => this.SmoothLeakyReLU(z));
    const zOutput = [
      hiddenActivations[0] * this.W2[0][0] + hiddenActivations[1] * this.W2[1][0] + hiddenActivations[2] * this.W2[2][0] + this.B3[0],
      hiddenActivations[0] * this.W2[0][1] + hiddenActivations[1] * this.W2[1][1] + hiddenActivations[2] * this.W2[2][1] + this.B3[1]
    ];
    const outputActivations = zOutput.map(z => this.Sigmoid(z));
    return outputActivations;
  }
}

class Bird {
  constructor(parent, lR) {
    this.NN = new Network(parent, lR);
    this.y = Height/2;
    this.aG = 0;
    this.jumping = false;
    this.latestJump = 0;
    this.jumpSpeed = 300
    this.jumpHeight = 5;
  }
  jump() {
    if(performance.now() - this.latestJump < Number(document.querySelector(".jI").value)){
      return;
    }
    this.jumping = true;
    this.latestJump = performance.now();
    this.aG = Number(document.querySelector(".jS").value);
    // this.y -= this.aG;
  }
  draw() {
    if(!this.jumping){
      ctx.drawImage(bird_IMG, 150, this.y, 100, 100);
    } else {
      ctx.drawImage(bird_IMG_jump, 150, this.y+25, 100, 50);
    }
  }
  tick() {
    this.y -= this.aG;
    this.aG -= window.gravity;
    if(this.y > Height || this.y < -100){
      birds.splice(birds.indexOf(this), 1);
    }
    this.draw();
  }
  movement() {
    let c = this.NN.Calculate(inputs(this));
    if(c[0] < c[1]){
      this.jump();
    }
  }
}

class Pipe {
  constructor(h1, h2) {
    this.h1 = h1;
    this.h2 = h2;
    this.x = Width;
  }
  draw() {
    ctx.fillStyle = "green";
    ctx.fillRect(this.x, 0, 50, this.h1);
    ctx.fillRect(this.x, Height-this.h2, 50, this.h2)
  }
  tick() {
    this.x -= Speed;
    this.draw();
    if(this.x < -50){
      pipes.splice(pipes.indexOf(this), 1);
      Score++;
    }
  }
  isTouching(x, y){
    if(x+85 > this.x && y > 0 && x < this.x+50 && y+30 < this.h1){
      return true;
    } else if (y + 60 > Height - this.h2 && x < this.x + 50 && x + 85 > this.x){
      return true;
    }
  }
}
let Gdata = [];
let pipes = [];
let birds = [];
function clear() {
  ctx.clearRect(0, 0, Width, Height)
}
function SummonPipe() {
  let p = Math.floor(Math.random() * Height/2);
  let pipe = new Pipe(p,Height - p - 400);
  pipes.push(pipe);
}
// let Pbird = new Bird(null, 0.01, 5);
window.learn_rate = 1;
document.querySelector(".lr").addEventListener('input', () => {
  window.learn_rate = Number(document.querySelector(".lr").value);
})
document.querySelector(".gravity").addEventListener('input', () => {
  window.gravity = Number(document.querySelector(".gravity").value);
})
function Start(population, parent){
  Score = 0;
  for(var i=0;i<population;i++){
    birds.push(new Bird(parent, window.learn_rate));
  }
  let best = 0;
  window.I = setInterval(()=>{
    clear();
    ctx.font = "30px Quicksand";
    ctx.fillText("Score: "+Score, 10, 50);
    ctx.fillText("High Score: "+window.HS, 10, 100);
    ctx.fillText("Generation "+Generation, 10, 150);
    birds.forEach(bird => {
      bird.tick()
    });
    pipes.forEach(pipe => {
      pipe.tick()
      birds.forEach(bird => {
        if(pipe.isTouching(150, bird.y)) {
          birds.splice(birds.indexOf(bird),1)
        }
      });
    });
    if(birds.length == 1 && best == 0){
      best = birds[0];
    }
    if(birds.length == 0){
      clearInterval(I);
      clearInterval(B);
      Generation++;
      Gdata.push([Generation-1, Score])
      best.y = 150;
      window.HS = Math.max(window.HS||0, Score);
      Start(Number(document.querySelector(".pop").value), best==0?birds[3]:best);
      if(best != 0){
        birds.push(best);
      }
      pipes = [];
      SummonPipe();
    }
  }, 7);
  setInterval(()=>{
    birds.forEach(bird => bird.movement());
  }, 400)
  setTimeout(()=>{window.B = setInterval(() => {
    SummonPipe();
  }, 2000);})
};
window.addEventListener("keydown",(e)=>{
  if(e.key == " "){
      birds.forEach(bird => bird.jump())
  }
});
Speed = 1;
Generation = 1;
SummonPipe();
Start(20,null)
