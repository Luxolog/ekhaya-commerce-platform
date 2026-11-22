import { assertEquals } from "jsr:@std/assert";
import { understandProductQuery, rankMarketplaceProducts, buildDiscoveryQueries, selectAdditionalDiscoveryQueries } from "../functions/marketplace-search/search-relevance.ts";

Deno.test("corrects Inspirion typo and infers Dell Inspiron laptop",()=>{
 const intent=understandProductQuery("dell inspirion 15 3000");
 assertEquals(intent.originalQuery,"dell inspirion 15 3000");
 assertEquals(intent.normalizedQuery,"dell inspiron 15 3000 laptop");
 assertEquals(intent.brand,"Dell");
 assertEquals(intent.category,"laptop");
 assertEquals(intent.accessoryIntent,false);
});
Deno.test("explicit accessory query remains accessory intent",()=>{
 const intent=understandProductQuery("dell 15 3000 keyboard");
 assertEquals(intent.accessoryIntent,true);
 assertEquals(intent.category,"keyboard");
});
Deno.test("complete laptop outranks and separates accessories",()=>{
 const intent=understandProductQuery("dell inspirion 15 3000");
 const result=rankMarketplaceProducts([
  {id:"1",title:"Dell Inspiron 15 3000 Laptop",brand:"Dell",url:"https://example.test/laptop"},
  {id:"2",title:"Dell Inspiron 15 3000 Replacement Keyboard",brand:"Dell",url:"https://example.test/keyboard"},
  {id:"3",title:"Dell Inspiron 15 3000 Replacement Battery",brand:"Dell",url:"https://example.test/battery"},
 ],intent);
 assertEquals(result.products.length,1);
 assertEquals(result.products[0].id,"1");
 assertEquals(result.accessories.length,2);
 assertEquals(result.products[0].match_classification,"Exact match");
});
Deno.test("refurbished condition is labelled without excluding a relevant laptop",()=>{
 const intent=understandProductQuery("hp elitebook 840 g5 laptop");
 const result=rankMarketplaceProducts([{id:"1",title:"Refurbished HP EliteBook 840 G5 Laptop",brand:"HP"}],intent);
 assertEquals(result.products[0].condition_label,"Refurbished");
});
Deno.test("no price field affects relevance ranking",()=>{
 const intent=understandProductQuery("iphone 13 128gb");
 const result=rankMarketplaceProducts([
  {id:"cheap",title:"Apple iPhone 13 128GB",brand:"Apple",price:100},
  {id:"expensive",title:"Apple iPhone 13 128GB",brand:"Apple",price:99999}
 ],intent);
 assertEquals(result.products[0].id,"cheap");
 assertEquals(result.products[1].id,"expensive");
});

Deno.test("HP laptop charger is classified as a charger accessory",()=>{
 const intent=understandProductQuery("hp laptop charger");
 assertEquals(intent.brand,"HP");
 assertEquals(intent.category,"charger");
 assertEquals(intent.accessoryIntent,true);
});
Deno.test("normalizes common Samsung and Apple product searches",()=>{
 assertEquals(understandProductQuery("samsng s24 ultra").normalizedQuery,"samsung s24 ultra");
 assertEquals(understandProductQuery("ipone 13 128gb").normalizedQuery,"apple iphone 13 128gb");
});

Deno.test("different model numbers do not qualify as strong matches",()=>{
 const intent=understandProductQuery("dell inspiron 15 3000");
 const result=rankMarketplaceProducts([{id:"wrong",title:"Dell Inspiron 15 5000 Laptop",brand:"Dell"}],intent);
 assertEquals(result.products.length,0);
 assertEquals(result.related_products.length,1);
});

Deno.test("recognises the expanded laptop families and Google Pixel brand",()=>{
 assertEquals(understandProductQuery("lenovo thinkpad t14 gen 3").brand,"Lenovo");
 assertEquals(understandProductQuery("google pixel 8").brand,"Google");
 assertEquals(understandProductQuery("hp probook 450 g8").category,"laptop");
 assertEquals(understandProductQuery("acer aspire 5").category,"laptop");
});
Deno.test("corrects additional common laptop and accessory spelling errors",()=>{
 assertEquals(understandProductQuery("dell inspirone 15 3000").normalizedQuery,"dell inspiron 15 3000 laptop");
 assertEquals(understandProductQuery("hp laptop chargr").category,"charger");
 assertEquals(understandProductQuery("dell latitude 5420").category,"laptop");
});
Deno.test("keeps accessories separate from complete products for explicit laptop intent",()=>{
 const intent=understandProductQuery("hp elitebook 840 g5");
 const result=rankMarketplaceProducts([
  {id:"laptop",title:"HP EliteBook 840 G5 Laptop",brand:"HP"},
  {id:"screen",title:"HP EliteBook 840 G5 Replacement Screen",brand:"HP"},
  {id:"charger",title:"HP Laptop Charger",brand:"HP"}
 ],intent);
 assertEquals(result.products.some(p=>p.id==="laptop"),true);
 assertEquals(result.accessories.length,2);
});

Deno.test("builds a bounded, deduplicated query plan preserving the original query",()=>{
 const intent=understandProductQuery("dell inspirion 15 3000");
 const plan=buildDiscoveryQueries(intent,4);
 assertEquals(plan[0],"dell inspirion 15 3000");
 assertEquals(new Set(plan.map(q=>q.toLowerCase().replace(/[^a-z0-9]+/g," ").trim())).size,plan.length);
 assertEquals(plan.length<=4,true);
});
Deno.test("conditional discovery stops when enough exact results exist",()=>{
 const intent=understandProductQuery("iphone 13 128gb");
 const ranked=rankMarketplaceProducts([
  {id:"a",title:"Apple iPhone 13 128GB",brand:"Apple",description:"Apple iPhone 13 128GB"},
  {id:"b",title:"Apple iPhone 13 128GB Blue",brand:"Apple",description:"Apple iPhone 13 128GB"},
  {id:"c",title:"Apple iPhone 13 128GB Midnight",brand:"Apple",description:"Apple iPhone 13 128GB"}
 ],intent).products;
 assertEquals(selectAdditionalDiscoveryQueries(intent,ranked,["apple iphone 13 128gb"],2).length,0);
});
Deno.test("conditional discovery allows targeted follow-ups for weak results only",()=>{
 const intent=understandProductQuery("hp elitebook 840 g5");
 const weak=rankMarketplaceProducts([{id:"x",title:"HP EliteBook Laptop Bag",brand:"HP"}],intent).products;
 const followups=selectAdditionalDiscoveryQueries(intent,weak,["hp elitebook 840 g5 laptop"],2);
 assertEquals(followups.length<=2,true);
});

Deno.test("discovery query planner normalizes repeated whitespace before deduplication",()=>{
 const intent=understandProductQuery("dell inspirion 15 3000");
 const plan=buildDiscoveryQueries(intent,4);
 for (const query of plan) {
  assertEquals(/\\s{2,}/.test(query),false);
 }
 assertEquals(plan[0],"dell inspirion 15 3000");
});
