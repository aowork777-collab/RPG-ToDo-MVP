import { EQUIPMENT, normalizeInventory, equipmentBonuses } from "../data/equipment.mjs";
export function renderEquipmentShop(root,save,actions,locked) {
  if(!root)return;root.replaceChildren();
  const inventory=normalizeInventory(save.inventory),bonus=equipmentBonuses(inventory);
  const summary=document.createElement("p");summary.className="equipment-summary";
  summary.textContent="装備効果：攻撃力 +"+bonus.attack+" / 最大HP +"+bonus.hp+(locked?" · 戦闘終了後に変更できます":" · 購入時に自動で装備");
  root.append(summary);
  const grid=document.createElement("div");grid.className="equipment-grid";
  for(const item of EQUIPMENT){
    const owned=inventory.owned.includes(item.id),equipped=inventory.equipped[item.slot]===item.id;
    const card=document.createElement("article");card.className="equipment-card"+(equipped?" equipped":"");
    const type=document.createElement("small");type.textContent=item.slot==="weapon"?"WEAPON / 武器":"ARMOR / 防具";
    const title=document.createElement("h3");title.textContent=item.name;
    const detail=document.createElement("p");detail.textContent=(item.attack?"攻撃力 +"+item.attack:"最大HP +"+item.hp)+" · "+item.description;
    const button=document.createElement("button");button.className="game-secondary-button";button.type="button";
    button.textContent=equipped?"装備中":owned?"装備する":item.price+" GOLDで購入";
    button.disabled=locked||equipped||(!owned&&save.gold<item.price);
    button.addEventListener("click",()=>owned?actions.equipItem(item.id):actions.buyItem(item.id));
    card.append(type,title,detail,button);grid.append(card);
  }
  root.append(grid);
}
