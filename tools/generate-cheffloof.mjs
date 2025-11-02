import { writeFileSync, mkdirSync } from "node:fs";

const chefNames = [
  "Gordon Ramsay","Jamie Oliver","Alain Ducasse","Thomas Keller","Wolfgang Puck",
  "Heston Blumenthal","Massimo Bottura","Ferran Adria","Rene Redzepi","Marco Pierre White",
  "Grant Achatz","Paul Bocuse","Dominique Crenn","Mauro Colagreco","Nobu Matsuhisa",
  "Clare Smyth","Jose Andres","Enrique Olvera","Virgilio Martinez","Gaggan Anand",
  "Vikas Khanna","Vineet Bhatia","Sanjeev Kapoor","Helene Darroze","Alice Waters",
  "Rick Bayless","Michael Mina","Curtis Stone","Bobby Flay","Guy Fieri",
  "Emeril Lagasse","Martin Berasategui","Andoni Luis Aduriz","Carme Ruscalleda","Joan Roca",
  "Tetsuya Wakuda","Seiji Yamamoto","Yoshihiro Murata","Ana Ros","Pia Leon",
  "Nadia Santini","Yannick Alleno","Pierre Gagnaire","Daniel Boulud","Raymond Blanc",
  "Michel Bras","Narisawa Yoshihiro","Alex Atala","Henrique Sa Pessoa","Helena Rizzo"
];

const today = new Date();
const photos = chefNames.slice(0,50).map((name, i) => {
  const date = new Date(today.getTime() - i*86400000).toISOString().slice(0,10);
  const q = encodeURIComponent(`${name} chef portrait`);
  return {
    id: `c-${String(i+1).padStart(3,"0")}`,
    name,
    dateTaken: date,
    thumbSrc: `https://source.unsplash.com/featured/800x600/?${q}&sig=${i*2+1}`,
    fullSrc:  `https://source.unsplash.com/featured/1600x1200/?${q}&sig=${i*2+2}`,
    author: {
      name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=80`,
      userSince: `${2017 + (i%7)}-0${(i%9)+1}-01`,
      channel: `@${name.toLowerCase().replace(/[^a-z]+/g,"")}`
    }
  };
});

mkdirSync("api", { recursive: true });
writeFileSync("api/chefs.json", JSON.stringify(photos, null, 2));
console.log("Wrote api/chefs.json with", photos.length, "chefs");
