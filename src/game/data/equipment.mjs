export const EQUIPMENT = Object.freeze([
  {id:"bronze-blade",slot:"weapon",name:"旅人の剣",price:45,attack:3,hp:0,description:"最初の一歩を支える剣。"},
  {id:"moon-blade",slot:"weapon",name:"月影の剣",price:160,attack:8,hp:0,description:"月の光を宿した切れ味。"},
  {id:"astral-blade",slot:"weapon",name:"星天の剣",price:420,attack:16,hp:0,description:"遠征を切り開く星の刃。"},
  {id:"travel-cloak",slot:"armor",name:"旅人のマント",price:40,attack:0,hp:15,description:"小さな備えが冒険を長くする。"},
  {id:"moon-cloak",slot:"armor",name:"月影のマント",price:145,attack:0,hp:35,description:"月明かりの守りをまとう。"},
  {id:"astral-cloak",slot:"armor",name:"星天のマント",price:380,attack:0,hp:65,description:"星々の力を織り込んだ守り。"},
].map(Object.freeze));
export function normalizeInventory(raw) {
  const owned=[...new Set(Array.isArray(raw?.owned)?raw.owned.filter(id=>EQUIPMENT.some(item=>item.id===id)):[])];
  const equipped={weapon:null,armor:null};
  for(const slot of ["weapon","armor"])if(EQUIPMENT.some(item=>item.id===raw?.equipped?.[slot]&&item.slot===slot&&owned.includes(item.id)))equipped[slot]=raw.equipped[slot];
  return {owned,equipped};
}
export function equipmentBonuses(raw) {
  const inventory=normalizeInventory(raw);
  return EQUIPMENT.filter(item=>Object.values(inventory.equipped).includes(item.id)).reduce((sum,item)=>({attack:sum.attack+item.attack,hp:sum.hp+item.hp}),{attack:0,hp:0});
}
export function purchaseEquipment(save,id) {
  const item=EQUIPMENT.find(item=>item.id===id);if(!item)return {ok:false,message:"装備が見つかりません。"};
  save.inventory=normalizeInventory(save.inventory);
  if(save.inventory.owned.includes(id))return {ok:false,message:"購入済みの装備です。"};
  if(!Number.isFinite(save.gold)||save.gold<item.price)return {ok:false,message:"GOLDが足りません。遠征で獲得しましょう。"};
  save.gold-=item.price;save.inventory.owned.push(id);save.inventory.equipped[item.slot]=id;
  return {ok:true,message:item.name+"を購入して装備しました。"};
}
export function equipItem(save,id) {
  save.inventory=normalizeInventory(save.inventory);
  const item=EQUIPMENT.find(item=>item.id===id);
  if(!item||!save.inventory.owned.includes(id))return {ok:false,message:"購入済みの装備を選んでください。"};
  save.inventory.equipped[item.slot]=id;return {ok:true,message:item.name+"を装備しました。"};
}
