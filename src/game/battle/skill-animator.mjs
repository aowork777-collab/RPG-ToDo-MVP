// Animation timing is separate from damage rules, so presentation cannot award extra hits.
export class SkillAnimator {
  constructor(controller) { this.c = controller; }
  async focus(x, y, zoom, duration = .2) {
    const c=this.c;
    if(c.renderer.camera) await c.move(c.renderer.camera,{x,y,zoom},duration);
  }
  async beforeImpact(skill, target) {
    const c=this.c, player=c.playerActor, enemy=c.actor(target.id), fx=c.renderer;
    fx.addEffect("skill-title",0,0,skill.subtitle);
    if(skill.id==="ultimate"){
      player.setState("charge");fx.addEffect("rune",player.x,player.y-95);
      c.audio?.play("charge");await this.focus(player.x+80,290,1.22,.25);
      fx.addEffect("cutin",0,0,skill.subtitle);c.audio?.play("ultimate");
      await c.pause(1.68);
      await this.focus(510,290,1.06,.14);
      fx.addEffect("speedlines",0,0);player.attack();
      for(const actor of c.enemyActors.filter(a=>!a.dead)){
        fx.addEffect("blade-violet",actor.x,actor.y-85);
        await c.pause(.08);
        fx.addEffect("starfall",actor.x,actor.y-15);
      }
      await c.pause(.24);
      fx.shake(.22);
      return;
    }
    if(skill.type==="attack"){
      const special=skill.id==="power-slash";
      player.setState(special?"charge":"run");
      if(special){fx.addEffect("rune",player.x,player.y-100);c.audio?.play("charge");}
      await this.focus((player.homeX+enemy.x)/2,305,special?1.18:1.1,.16);
      await c.move(player,{x:player.homeX-20},.09);
      if(special)await c.pause(.18);
      player.setState("run");
      fx.addEffect("speedlines",0,0);
      await c.move(player,{x:enemy.x-105,y:enemy.y},.17);
      player.attack();c.audio?.play("slash");
      fx.addEffect(special?"blade-violet":"blade-gold",enemy.x,enemy.y-80);
      await c.pause(special ? .17 : .12);
      if(special){
        player.attack();fx.addEffect("blade-violet",enemy.x,enemy.y-80,"reverse");
        c.audio?.play("slash");
        const selectedIndex = c.state.enemies.findIndex(e => e.id === target.id);
        const adjacentIds = c.state.enemies.filter((e,index) => e.hp > 0 && Math.abs(index-selectedIndex) === 1).map(e => e.id);
        for(const actor of c.enemyActors.filter(a => adjacentIds.includes(a.id))){
          fx.addProjectile("shadow",enemy.x,enemy.y-80,actor.x,actor.y-80);
        }
        await c.pause(.12);
      }
      return;
    }
    player.setState("guard");
    await this.focus(player.x+100,295,1.12,.18);
    fx.addEffect("rune",player.x,player.y-95);
    await c.pause(.26);
  }
  async afterImpact(skill) {
    const c=this.c, actor=c.playerActor;
    await c.pause(skill.id==="ultimate" ? .32 : .13);
    if(skill.type==="attack" && skill.id!=="ultimate"){
      actor.setState("run");actor.facing=-1;
      await c.move(actor,{x:actor.homeX,y:actor.homeY},.25);actor.facing=1;
    }
    actor.setState("idle");
    await this.focus(480,270,1,.22);
  }
}
