const homeProducts=[
{id:"puffer",n:"Пуховик REVORA",p:4000,o:4500,b:"SALE"},
{id:"zip",n:"Зіп худі",p:2600,b:"NEW"},
{id:"jacket",n:"Куртка / вітровка",p:3500,b:"TOP"},
{id:"shorts",n:"Шорти",p:1800,o:2100,b:"SALE"}
];
const moneyHome=n=>n.toLocaleString("uk-UA")+" ₴";
function homeCard(x){return `<article class="product"><a class="productLink" href="product.html?id=${x.id}"><div class="productImg">ТВОЄ ФОТО<br>ТОВАРУ</div><div class="badge">${x.b}</div><div class="info"><b>${x.n}</b><p class="price">${moneyHome(x.p)} ${x.o?`<span class="old">${moneyHome(x.o)}</span>`:""}</p></div></a><a class="add homeView" href="product.html?id=${x.id}">ПЕРЕГЛЯНУТИ</a></article>`}
const grid=document.querySelector("#products");if(grid)grid.innerHTML=homeProducts.map(homeCard).join("");
const popular=document.querySelector("#popularProducts");if(popular)popular.innerHTML=[homeProducts[2],homeProducts[0],homeProducts[1],homeProducts[3]].map(homeCard).join("");
let slides=[...document.querySelectorAll(".heroSlide")],current=0,timer;
function showSlide(i){if(!slides.length)return;current=(i+slides.length)%slides.length;slides.forEach((s,n)=>s.classList.toggle("active",n===current));const no=document.querySelector("#heroNo");if(no)no.textContent=String(current+1).padStart(2,"0")+" / "+String(slides.length).padStart(2,"0")}
function autoHero(){clearInterval(timer);timer=setInterval(()=>showSlide(current+1),5000)}
document.querySelector("#heroPrev")?.addEventListener("click",()=>{showSlide(current-1);autoHero()});
document.querySelector("#heroNext")?.addEventListener("click",()=>{showSlide(current+1);autoHero()});
showSlide(0);autoHero();
document.querySelector("#menu")?.addEventListener("click",()=>document.querySelector("#mobileNav")?.classList.toggle("open"));
document.querySelectorAll("#mobileNav a").forEach(a=>a.addEventListener("click",()=>document.querySelector("#mobileNav")?.classList.remove("open")));
setTimeout(()=>document.querySelector("#intro")?.remove(),1300);