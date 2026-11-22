export type ProductIntent = {
  originalQuery: string;
  normalizedQuery: string;
  brand: string | null;
  category: string | null;
  modelTokens: string[];
  accessoryIntent: boolean;
  requestedCondition: "new" | "refurbished" | "used" | null;
};
export type RankedProduct = Record<string, unknown> & {
  relevance_score: number;
  match_classification: "Exact match" | "Strong match" | "Related product" | "Accessory";
  result_group: "best_match" | "related" | "accessory";
  condition_label: "Refurbished" | "Used" | "New" | "Condition not stated";
};

const SPELLING: Record<string, string> = {
  inspirion: "inspiron", inspirone: "inspiron", elitebok: "elitebook", elitebookk: "elitebook",
  samsng: "samsung", samsumg: "samsung", samsun: "samsung", appl: "apple", ipone: "iphone",
  galaxyy: "galaxy", chager: "charger", chargr: "charger", keybord: "keyboard", keybaord: "keyboard",
  latitute: "latitude", pavillion: "pavilion", vivobookk: "vivobook", thinkapd: "thinkpad",
};
const BRANDS: Record<string, string> = {
  dell: "Dell", hp: "HP", "hewlett-packard": "HP", lenovo: "Lenovo",
  apple: "Apple", iphone: "Apple", samsung: "Samsung", acer: "Acer",
  asus: "ASUS", microsoft: "Microsoft", google: "Google", pixel: "Google", logitech: "Logitech",
};
const ACCESSORY_TERMS = ["keyboard","keyboards","charger","charging cable","cable","battery","batteries","hinge","screen replacement","replacement screen","adapter","mouse","case","cover","dock","replacement"];
const CATEGORY_TERMS: Record<string,string[]> = {
  laptop:["laptop","notebook","inspiron","elitebook","probook","pavilion","thinkpad","ideapad","latitude","vostro","xps","aspire","vivobook","macbook"],
  smartphone:["iphone","smartphone","mobile phone","galaxy s","galaxy a","pixel","s24","s23","s22","s21"],
  tablet:["tablet","ipad","galaxy tab"],
  keyboard:["keyboard","keyboards"], charger:["charger","charging cable","power adapter"],
};
const tokens = (s:string) => s.toLowerCase().replace(/[^a-z0-9]+/g," ").trim().split(/\s+/).filter(Boolean);
const includesPhrase = (haystack:string, phrase:string) => (" "+haystack+" ").includes(" "+phrase+" ");
export function understandProductQuery(input:string): ProductIntent {
  const originalQuery = input.trim().slice(0,160);
  const corrected = tokens(originalQuery).map(t=>SPELLING[t]??t);
  const raw = corrected.join(" ");
  const brandToken = corrected.find(t=>BRANDS[t]);
  const brand = brandToken ? BRANDS[brandToken] : null;
  const accessoryIntent = ACCESSORY_TERMS.some(term=>includesPhrase(raw,term));
  let category:string|null = null;
  if (accessoryIntent) {
    for (const kind of ["keyboard","charger"]) {
      const terms = CATEGORY_TERMS[kind] ?? [];
      if (terms.some(term=>includesPhrase(raw,term))) { category=kind; break; }
    }
  }
  if (!category) {
    for (const [kind,terms] of Object.entries(CATEGORY_TERMS)) {
      if (terms.some(term=>includesPhrase(raw,term))) { category=kind; break; }
    }
  }
  const condition = corrected.includes("refurbished") ? "refurbished" : corrected.includes("used") || corrected.includes("secondhand") ? "used" : corrected.includes("new") ? "new" : null;
  const stop = new Set(["the","and","for","with","brand","laptop","notebook","computer","new","used","refurbished","gb","tb","ram","ssd","hdd","wifi","wi","4g","5g"]);
  const modelTokens = corrected.filter(t=>!stop.has(t) && t!==brandToken && !ACCESSORY_TERMS.some(term=>tokens(term).includes(t)));
  let normalizedQuery = corrected.join(" ");
  if (!accessoryIntent && category==="laptop" && !/\b(laptop|notebook)\b/.test(normalizedQuery)) normalizedQuery += " laptop";
  if (brand && !normalizedQuery.startsWith(brand.toLowerCase())) normalizedQuery = brand.toLowerCase()+" "+normalizedQuery;
  return {originalQuery,normalizedQuery:normalizedQuery.replace(/\s+/g," ").trim(),brand,category,modelTokens,accessoryIntent,requestedCondition:condition};
}

const queryKey = (value:string) => tokens(value).join(" ");
export function buildDiscoveryQueries(intent:ProductIntent, maxRequests=3):string[] {
  const candidates = [
    intent.originalQuery,
    intent.normalizedQuery,
    [intent.brand, ...intent.modelTokens].filter(Boolean).join(" "),
    intent.category === "laptop" ? [intent.brand, ...intent.modelTokens, "laptop"].filter(Boolean).join(" ") :
      intent.category === "smartphone" ? [intent.brand, ...intent.modelTokens, "smartphone"].filter(Boolean).join(" ") :
      intent.category === "charger" ? [intent.brand, ...intent.modelTokens, "charger"].filter(Boolean).join(" ") :
      intent.category === "keyboard" ? [intent.brand, ...intent.modelTokens, "keyboard"].filter(Boolean).join(" ") : ""
  ];
  const unique:string[]=[];
  const seen=new Set<string>();
  for (const candidate of candidates) {
    const value=candidate.replace(/\s+/g," ").trim();
    const key=queryKey(value);
    if (!value || !key || seen.has(key)) continue;
    seen.add(key); unique.push(value);
    if (unique.length >= Math.max(1,Math.min(4,Math.floor(maxRequests)))) break;
  }
  return unique;
}
export function selectAdditionalDiscoveryQueries(
  intent:ProductIntent,
  ranked:RankedProduct[],
  usedQueries:string[],
  maxAdditional=2
):string[] {
  if (maxAdditional <= 0) return [];
  const best=ranked[0]?.relevance_score ?? 0;
  const exact=ranked.filter(p=>p.match_classification==="Exact match").length;
  const strong=ranked.filter(p=>p.match_classification==="Strong match").length;
  const additionalBudget=ranked.length>=3 && exact>=1 && best>=80 ? 0 :
    ranked.length>=2 && (best>=70 || strong>=2) ? 1 : Math.min(2,maxAdditional);
  const used=new Set(usedQueries.map(queryKey));
  return buildDiscoveryQueries(intent,4).filter(q=>!used.has(queryKey(q))).slice(0,Math.min(maxAdditional,additionalBudget || 0));
}
function textOf(p:Record<string,unknown>):string {
  return [p.title,p.brand,p.description,p.key_specs,p.product_badge].flatMap(v=>Array.isArray(v)?v:[v]).filter(v=>typeof v==="string").join(" ").toLowerCase();
}
function isAccessory(text:string):boolean { return ACCESSORY_TERMS.some(term=>includesPhrase(text,term)); }
function conditionOf(text:string):RankedProduct["condition_label"] {
  if (/\b(refurbished|renewed|reconditioned)\b/.test(text)) return "Refurbished";
  if (/\b(used|pre[- ]owned|second hand)\b/.test(text)) return "Used";
  if (/\b(new|brand new)\b/.test(text)) return "New";
  return "Condition not stated";
}
export function rankMarketplaceProducts<T extends Record<string,unknown>>(items:T[], intent:ProductIntent):{
  products:RankedProduct[]; related_products:RankedProduct[]; accessories:RankedProduct[];
} {
  const seen=new Set<string>();
  const ranked=items.map(p=>{
    const title=String(p.title??"");
    const text=textOf(p);
    const accessory=isAccessory(title.toLowerCase());
    const titleTokens=tokens(title);
    const brandMatch=!!intent.brand && (String(p.brand??"").toLowerCase()===intent.brand.toLowerCase() || includesPhrase(text,intent.brand.toLowerCase()));
    const matchedModel=intent.modelTokens.filter(t=>titleTokens.includes(t));
    const modelRatio=intent.modelTokens.length?matchedModel.length/intent.modelTokens.length:0;
    const modelConflict=intent.modelTokens.some(t=>/[0-9]/.test(t)&&!titleTokens.includes(t));
    const categoryMatch=!intent.category || (intent.category==="laptop" ? /\b(laptop|notebook|inspiron|elitebook|probook|thinkpad|pavilion|latitude|vostro|xps|aspire|vivobook|ideapad|macbook)\b/.test(text) && !accessory : intent.category==="smartphone" ? /\b(iphone|smartphone|galaxy|pixel)\b/.test(text) && !accessory : intent.category==="tablet" ? /\b(tablet|ipad|galaxy tab)\b/.test(text) && !accessory : title.toLowerCase().includes(intent.category));
    const requestedModelTokens = intent.modelTokens.filter(t => /[0-9]/.test(t));
    const exactModel = requestedModelTokens.length > 0 && requestedModelTokens.every(t => titleTokens.includes(t));
    const exact=titleTokens.join(" ")===tokens(intent.normalizedQuery).join(" ") || (brandMatch && categoryMatch && exactModel && modelRatio >= 0.8);
    const descriptionTokens=tokens(String(p.description??""));
    const descriptionRatio=intent.modelTokens.length
      ? intent.modelTokens.filter(t=>descriptionTokens.includes(t)).length/intent.modelTokens.length
      : 0;
    const condition_label=conditionOf(text);
    const conditionConflict=!!intent.requestedCondition && condition_label.toLowerCase()!==intent.requestedCondition;
    const score=Math.max(0,Math.min(100,
      (exact?35:Math.min(35,modelRatio*35))+
      (brandMatch?20:0)+(categoryMatch?20:0)+(modelRatio*15)+
      (descriptionRatio*10)-
      (accessory && !intent.accessoryIntent?70:0)-
      (!categoryMatch?35:0)-
      (modelConflict?50:0)-
      (conditionConflict?12:0)-
      (intent.brand && !brandMatch?20:0)
    ));
    const classification:RankedProduct["match_classification"]=accessory?"Accessory":score>=80?"Exact match":score>=55?"Strong match":"Related product";
    const result_group:RankedProduct["result_group"]=accessory?"accessory":score>=55?"best_match":"related";
    const stableId = p.asin ?? p.plid ?? p.product_id ?? p.item_id ?? p.id;
    const rawUrl = typeof p.url === "string" ? p.url.trim() : "";
    let canonicalUrl = rawUrl.toLowerCase();
    if (rawUrl) {
      try {
        const parsed = new URL(rawUrl);
        parsed.search = "";
        parsed.hash = "";
        canonicalUrl = parsed.toString().replace(/\\/$/, "").toLowerCase();
      } catch {
        canonicalUrl = rawUrl.split(/[?#]/, 1)[0].replace(/\\/$/, "").toLowerCase();
      }
    }
    const fallbackTitle = [p.brand, title].map(v => String(v ?? "").trim().toLowerCase()).filter(Boolean).join(" ");
    const identity = String(stableId ?? canonicalUrl || fallbackTitle).toLowerCase();
    return {...p,relevance_score:Math.round(score),match_classification:classification,result_group,condition_label,_identity:identity};
  }).filter(p=>{
    if(seen.has(p._identity)) return false;
    seen.add(p._identity); return true;
  }).sort((a,b)=>b.relevance_score-a.relevance_score);
  const clean=(p:RankedProduct)=>{const {_identity,...rest}=p;return rest;};
  return {
    products:ranked.filter(p=>p.result_group==="best_match").map(clean),
    related_products:ranked.filter(p=>p.result_group==="related").map(clean),
    accessories:ranked.filter(p=>p.result_group==="accessory").map(clean),
  };
}
