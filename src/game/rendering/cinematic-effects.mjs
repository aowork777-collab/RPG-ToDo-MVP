import { ULTIMATE_IMAGE_URL, GAME_WIDTH as W, GAME_HEIGHT as H } from "../config.mjs";

const ease = p => 1 - Math.pow(1 - p, 3);
const clamp = p => Math.max(0, Math.min(1, p));

// Screen-space art is kept separate from the moving battle camera.
export function drawCinematic(ctx, effect, assets, reducedMotion) {
  const p = clamp(effect.elapsed / effect.duration);
  ctx.save();
  if (effect.type === "cutin") {
    const alpha = Math.min(1, p * 8, (1-p) * 7);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#070e22"; ctx.fillRect(0,0,W,H);
    const image = assets.getImage(ULTIMATE_IMAGE_URL);
    if (image) {
      const zoom = reducedMotion ? 1 : 1.02 + p * .06;
      const width = W * zoom, height = width * image.naturalHeight / image.naturalWidth;
      const slide = reducedMotion ? 0 : (1-ease(clamp(p*3))) * 170;
      ctx.drawImage(image, (W-width)/2 + slide, (H-height)/2, width, height);
    }
    const shade = ctx.createLinearGradient(0,H*.35,W,H);
    shade.addColorStop(0,"rgba(4,9,24,0)"); shade.addColorStop(.65,"rgba(4,9,24,.2)"); shade.addColorStop(1,"rgba(4,9,24,.98)");
    ctx.fillStyle = shade; ctx.fillRect(0,0,W,H);
    ctx.fillStyle = "rgba(3,8,20,.9)"; ctx.fillRect(0,0,W,26); ctx.fillRect(0,H-26,W,26);
    if (!reducedMotion) {
      ctx.strokeStyle = "rgba(170,231,255,.3)"; ctx.lineWidth=1;
      for(let i=0;i<9;i++){
        const x=((i*151+p*500)%(W+400))-200;
        ctx.beginPath();ctx.moveTo(x,30);ctx.lineTo(x-230,H-30);ctx.stroke();
      }
    }
    const textX = reducedMotion ? 902 : 902+(1-ease(clamp(p*3)))*100;
    ctx.textAlign="right";ctx.shadowColor="#060c1d";ctx.shadowBlur=18;
    ctx.fillStyle="#b4e8ff";ctx.font="700 15px system-ui";ctx.fillText("A S T R A L   O V E R D R I V E",textX,370);
    ctx.fillStyle="#fff";ctx.font="900 56px system-ui";ctx.fillText(effect.text || "星天・一閃",textX,438);
    ctx.fillStyle="#f0d49a";ctx.fillRect(textX-220,456,220*ease(clamp(p*3)),3);
  }
  if(effect.type==="speedlines" && !reducedMotion) {
    ctx.globalAlpha = Math.sin(p*Math.PI)*.55;
    ctx.strokeStyle="#c7eeff";ctx.lineWidth=1.5;
    for(let i=0;i<24;i++){
      const a=i*Math.PI/12+.05, r=210+(i%3)*24;
      ctx.beginPath();ctx.moveTo(W/2+Math.cos(a)*r,H/2+Math.sin(a)*r*.65);
      ctx.lineTo(W/2+Math.cos(a)*850,H/2+Math.sin(a)*600);ctx.stroke();
    }
  }
  if(effect.type==="skill-title"){
    ctx.globalAlpha=Math.min(1,p*8,(1-p)*5);
    ctx.fillStyle="rgba(6,15,32,.85)";
    ctx.beginPath();ctx.moveTo(0,45);ctx.lineTo(355,45);ctx.lineTo(330,93);ctx.lineTo(0,93);ctx.fill();
    ctx.fillStyle="#a8e5ff";ctx.fillRect(0,45,4,48);
    ctx.font="800 21px system-ui";ctx.textAlign="left";ctx.fillText(effect.text,24,76);
  }
  ctx.restore();
}

// Procedural trails / energy geometry. No video downloads or per-frame allocation of images.
export function drawEnergyEffect(ctx, effect, reducedMotion) {
  const p=clamp(effect.elapsed/effect.duration), fade=Math.sin(Math.PI*p);
  ctx.save();ctx.translate(effect.x,effect.y);ctx.globalAlpha=fade;
  ctx.globalCompositeOperation="lighter";
  const color=effect.type==="starfall" ? "#b1edff" : effect.type==="blade-gold" ? "#ffcf86" : "#bda5ff";
  ctx.strokeStyle=color;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=reducedMotion?0:22;
  if(effect.type==="starfall"){
    const width=12+Math.sin(p*Math.PI)*32;
    const beam=ctx.createLinearGradient(0,-440,0,20);
    beam.addColorStop(0,"rgba(117,174,255,0)");beam.addColorStop(.65,"rgba(140,221,255,.85)");beam.addColorStop(1,"#ffffff");
    ctx.fillStyle=beam;ctx.beginPath();ctx.moveTo(-150-width,-440);ctx.lineTo(-150+width,-440);ctx.lineTo(width,10);ctx.lineTo(-width,10);ctx.fill();
    ctx.strokeStyle="#e1f8ff";ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,0,35+p*110,12+p*24,0,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<(reducedMotion?3:18);i++){
      const a=i*2.399,r=p*(60+i%4*22);
      ctx.fillStyle=i%3?"#a4dfff":"#fff";
      ctx.fillRect(Math.cos(a)*r,Math.sin(a)*r*.7-25,3,3+p*8);
    }
  } else if(effect.type==="blade-gold" || effect.type==="blade-violet"){
    ctx.rotate(effect.text==="reverse" ? -.65 : .55);
    const radius=65+ease(p)*45;
    for(let i=0;i<3;i++){
      ctx.strokeStyle=i===0?"#fff":color;ctx.lineWidth=(i===0?4:9)*(1-p)+1;
      ctx.globalAlpha=fade*(1-i*.25);
      ctx.beginPath();ctx.ellipse(0,-30,radius+i*9,48+i*6,0,-2.4,-2.4+Math.PI*1.5*ease(clamp(p*2)));ctx.stroke();
    }
  } else if(effect.type==="rune"){
    ctx.rotate(reducedMotion?0:p*.8);ctx.lineWidth=2;
    for(const radius of [45,65]){
      ctx.beginPath();ctx.arc(0,0,radius,0,Math.PI*2);ctx.stroke();
    }
    ctx.beginPath();
    for(let i=0;i<=6;i++){const a=i*Math.PI/3;ctx.lineTo(Math.cos(a)*65,Math.sin(a)*65);}
    ctx.stroke();
  }
  ctx.restore();
}

