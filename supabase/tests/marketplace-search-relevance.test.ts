import { assertEquals } from "jsr:@std/assert";
import { understandProductQuery, rankMarketplaceProducts } from "../functions/marketplace-search/search-relevance.ts";

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
