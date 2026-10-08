const HOME_PRODUCTS=window.REVORA_PRODUCTS||[];
const moneyHome=n=>Number(n||0).toLocaleString("uk-UA")+" ₴";
const escapeHome=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function homeCard(x){
 const image=x.images?.[0]||x.image;
 const visual=image?'<img src="'+escapeHome(image)+'" alt="'+escapeHome(x.name)+'" loading="lazy">':'<span class="productMonogram">REVORA<br><small>'+escapeHome(x.category)+'</small></span>';
 return '<article class="product"><a class="productLink" href="product.html?id='+encodeURIComponent(x.id)+'"><div class="productImg">'+visual+'</div>'+(x.badge?'<div class="badge">'+escapeHome(x.badge)+'</div>':'')+'<div class="info"><small>'+escapeHome(x.category)+'</small><b>'+escapeHome(x.name)+'</b><p class="price">'+moneyHome(x.price)+(x.old?' <span class="old">'+moneyHome(x.old)+'</span>':'')+'</p></div></a><a class="add homeView" href="product.html?id='+encodeURIComponent(x.id)+'">ПЕРЕГЛЯНУТИ →</a></article>';
}
const grid=document.querySelector("#products");
if(grid)grid.innerHTML=HOME_PRODUCTS.filter(x=>x.badge==="SALE").slice(0,4).map(homeCard).join("")||'<p>Незабаром тут з’являться знижки REVORA.</p>';
const popular=document.querySelector("#popularProducts");
if(popular)popular.innerHTML=[...HOME_PRODUCTS].sort((a,b)=>(Number(b.badge==="TOP")-Number(a.badge==="TOP"))).slice(0,4).map(homeCard).join("");
const slides=[...document.querySelectorAll(".heroSlide")];let current=0,timer;
function showSlide(i){if(!slides.length)return;current=(i+slides.length)%slides.length;slides.forEach((s,n)=>{s.classList.toggle("active",n===current);s.setAttribute("aria-hidden",n!==current?"true":"false")});const no=document.querySelector("#heroNo");if(no)no.textContent=String(current+1).padStart(2,"0")+" / "+String(slides.length).padStart(2,"0")}
function autoHero(){clearInterval(timer);if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;timer=setInterval(()=>{if(!document.hidden)showSlide(current+1)},5500)}
document.querySelector("#heroPrev")?.addEventListener("click",()=>{showSlide(current-1);autoHero()});
document.querySelector("#heroNext")?.addEventListener("click",()=>{showSlide(current+1);autoHero()});
showSlide(0);autoHero();
document.querySelector("#menu")?.addEventListener("click",()=>{const n=document.querySelector("#mobileNav");n?.classList.toggle("open");document.querySelector("#menu").setAttribute("aria-expanded",n?.classList.contains("open")?"true":"false")});
document.querySelectorAll("#mobileNav a").forEach(a=>a.addEventListener("click",()=>document.querySelector("#mobileNav")?.classList.remove("open")));
const overlay=document.querySelector("#homeSearchOverlay"),search=document.querySelector("#homeSearchInput"),results=document.querySelector("#homeSearchResults");
function drawSearch(){if(!results)return;const query=search.value.trim().toLocaleLowerCase("uk-UA");const hits=query?HOME_PRODUCTS.filter(p=>(p.name+" "+p.category+" "+p.desc).toLocaleLowerCase("uk-UA").includes(query)).slice(0,7):HOME_PRODUCTS.slice(0,5);results.replaceChildren();if(!hits.length){const p=document.createElement("p");p.textContent="Нічого не знайдено. Спробуйте іншу назву.";results.append(p);return}for(const x of hits){const a=document.createElement("a");a.href="product.html?id="+encodeURIComponent(x.id);const label=document.createElement("span");label.textContent=x.name;const price=document.createElement("b");price.textContent=moneyHome(x.price);a.append(label,price);results.append(a)}}
function openSearch(){overlay.hidden=false;document.body.style.overflow="hidden";search.value="";drawSearch();search.focus()}
function closeSearch(){overlay.hidden=true;document.body.style.overflow=""}
document.querySelector("#search")?.addEventListener("click",openSearch);
document.querySelector("#homeSearchClose")?.addEventListener("click",closeSearch);
overlay?.addEventListener("click",e=>{if(e.target===overlay)closeSearch()});
search?.addEventListener("input",drawSearch);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!overlay.hidden)closeSearch();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();openSearch()}});
document.querySelector("#fav")?.addEventListener("click",()=>{location.href="catalog.html"});
setTimeout(()=>document.querySelector("#intro")?.remove(),1300);
