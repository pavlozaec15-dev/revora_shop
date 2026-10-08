const REVORA_PRODUCTS=[
{id:"puffer",name:"Пуховик REVORA",category:"Пуховики",price:4000,old:4500,badge:"SALE",sizes:["S","M","L","XL","XXL"],desc:"Теплий пуховик для холодного сезону. Відправка протягом 1–2 днів."},
{id:"zip",name:"Зіп худі",category:"Худі",price:2600,badge:"NEW",sizes:["XS","S","M","L","XL","XXL"],desc:"Зіп худі на кожен день. Зручна посадка та базовий силует."},
{id:"jacket",name:"Куртка / вітровка",category:"Куртки",price:3500,badge:"TOP",sizes:["XS","S","M","L","XL"],desc:"Легка куртка для міста та повсякденних образів."},
{id:"shorts",name:"Шорти",category:"Шорти",price:1800,old:2100,badge:"SALE",sizes:["XS","S","M","L","XL","XXL"],desc:"Комфортні шорти з практичною посадкою."},
{id:"hoodie",name:"Худі без замка",category:"Худі",price:2200,badge:"NEW",sizes:["XS","S","M","L","XL","XXL"],desc:"Базове худі без замка."},
{id:"tee",name:"Футболка REVORA",category:"Футболки",price:1100,badge:"NEW",sizes:["S","M","L","XL"],desc:"Базова футболка для щоденних образів."},
{id:"pants",name:"Штани",category:"Штани",price:2400,badge:"",sizes:["S","M","L","XL"],desc:"Повсякденні штани у мінімалістичному стилі."},
{id:"sneakers",name:"Кросівки",category:"Кросівки",price:3200,badge:"TOP",sizes:["36","37","38","39","40","41","42","43","44","45"],desc:"Кросівки для завершення образу."}
];
if (typeof window !== "undefined") window.REVORA_PRODUCTS = REVORA_PRODUCTS;
if (typeof module !== "undefined") module.exports = REVORA_PRODUCTS;
