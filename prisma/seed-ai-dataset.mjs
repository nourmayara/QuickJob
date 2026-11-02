import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import env from "@next/env";
import { copyFile, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(directory);
const marker = "[QuickJob AI dataset v1] installé";
const testAccountPassword = "QuickJob-Test2026!";
const targets = { workers: 60, recruiters: 15, missions: 120, applications: 200, skills: 40, experiences: 100 };
const day = 86_400_000;
const slug = value => value.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
const key = value => value.normalize("NFKD").replace(/\p{M}/gu, "").trim().replace(/\s+/g, " ").toLocaleLowerCase("fr");

const people = [
  ["Amina","Ben Amor"],["Youssef","Trabelsi"],["Mariem","Gharbi"],["Aziz","Mansouri"],["Sarra","Jaziri"],["Mehdi","Ayari"],["Nour","Bouzid"],["Khalil","Hamdi"],["Rania","Saidi"],["Anis","Chaabane"],
  ["Inès","Khelifi"],["Omar","Dridi"],["Salma","Mejri"],["Ahmed","Nasri"],["Yasmine","Chebbi"],["Malek","Abid"],["Eya","Haddad"],["Fares","Mrad"],["Lina","Ben Salem"],["Skander","Kammoun"],
  ["Mouna","Rekik"],["Wael","Karray"],["Hana","Tlili"],["Bilel","Zouari"],["Rahma","Fourati"],["Sami","Mabrouk"],["Asma","Kacem"],["Rayen","Dhaouadi"],["Leila","Bouazizi"],["Houssem","Belhaj"],
  ["Emna","Charfi"],["Nader","Ben Yedder"],["Olfa","Chatti"],["Marwen","Kooli"],["Syrine","Ben Romdhane"],["Ghassen","Gdoura"],["Wafa","Zribi"],["Tarek","Feki"],["Nesrine","Ammar"],["Aymen","Ben Mahmoud"],
  ["Dorra","Krichen"],["Seif","Hachicha"],["Imen","Baccouche"],["Zied","Jlassi"],["Amel","Ben Hmida"],["Haythem","Lahmar"],["Ons","Ben Ali"],["Moez","Sassi"],["Rim","Guesmi"],["Walid","Mellouli"],
  ["Kenza","Toumi"],["Ali","Jebali"],["Meriem","Kouki"],["Hamza","Ben Fredj"],["Sabrine","Mahfoudh"],["Adem","Ouertani"],["Chaima","Ben Moussa"],["Fadi","Cherif"],["Aya","Brahmi"],["Montassar","Miled"]
];
const recruiterPeople = [["Sofien","Ben Aissa"],["Najla","Khemiri"],["Karim","Dammak"],["Sonia","Riahi"],["Lotfi","Ben Rejeb"],["Maya","Ghozzi"],["Hatem","Louati"],["Samira","Belaid"],["Nabil","Mzoughi"],["Nadia","Khiari"],["Maher","Ben Othman"],["Soumaya","Mami"],["Riadh","Sellami"],["Hela","Jouini"],["Slim","Ben Abdallah"]];
const cities = ["Tunis","Ariana","La Marsa","Ben Arous","Manouba","Sousse","Monastir","Mahdia","Sfax","Nabeul","Hammamet","Bizerte","Béja","Jendouba","Kairouan","Gabès","Médenine","Gafsa"];
const skills = [
  ["Service en salle","Restauration"],["Prise de commandes","Restauration"],["Encaissement","Restauration"],["Hygiène alimentaire","Restauration"],["Préparation culinaire","Restauration"],
  ["Accueil client","Commerce"],["Vente","Commerce"],["Conseil client","Commerce"],["Mise en rayon","Commerce"],["Merchandising","Commerce"],["Gestion des stocks","Commerce"],["Prospection commerciale","Commerce"],["Négociation commerciale","Commerce"],["Fidélisation client","Commerce"],
  ["Préparation de commandes","Logistique"],["Manutention","Logistique"],["Inventaire","Logistique"],["Emballage","Logistique"],["Conduite de chariot","Logistique"],["Réception de marchandises","Logistique"],
  ["Support informatique","Informatique"],["Dépannage informatique","Informatique"],["Installation de logiciels","Informatique"],["Administration système","Informatique"],["Administration réseau","Informatique"],["Gestion de tickets","Informatique"],["Développement web","Informatique"],["JavaScript","Informatique"],["Bases de données SQL","Informatique"],["Git","Informatique"],
  ["Bureautique","Administration"],["Microsoft Excel","Administration"],["Saisie de données","Administration"],["Classement documentaire","Administration"],["Communication professionnelle","Administration"],
  ["Organisation événementielle","Événementiel"],["Montage de stands","Événementiel"],["Gestion des inscriptions","Événementiel"],["Travail en équipe","Services"],["Nettoyage professionnel","Services"]
];
if (skills.length !== 40 || new Set(skills.map(item => key(item[0]))).size !== 40) throw new Error("Le catalogue doit contenir exactement 40 compétences uniques.");
const domains = ["Restauration","Commerce","Logistique","Informatique","Administration","Événementiel","Services"];
const companies = ["Carthage Services","Medina Retail","Sahel Events","Atlas Logistique","Nexa Tunisie","Bureau Jasmin","Cap Bon Accueil","Ifriqiya Solutions","Oasis Commerce","Azur Hospitality","Cité Numérique","Kairouan Services","Sfax Distribution","Bizerte Expo","Djerba Assistance"];
const missionTitles = {
  Restauration: ["Service pour un déjeuner d’entreprise","Renfort en salle pour un mariage","Préparation d’un buffet"],
  Commerce: ["Conseiller de vente en boutique","Inventaire et mise en rayon","Animation commerciale"],
  Logistique: ["Préparation de commandes","Réception et tri de marchandises","Inventaire d’entrepôt"],
  Informatique: ["Support informatique de proximité","Installation de postes de travail","Assistance utilisateurs"],
  Administration: ["Assistant de saisie","Classement de dossiers","Mise à jour de tableaux Excel"],
  Événementiel: ["Accueil sur un salon","Montage d’un stand","Gestion des inscriptions"],
  Services: ["Installation d’un espace associatif","Renfort de nettoyage professionnel","Accueil et orientation du public"]
};

async function counts(db) {
  const [workers,recruiters,missions,applications,skillCount,experiences] = await Promise.all([
    db.user.count({ where: { role: "TRAVAILLEUR" } }), db.user.count({ where: { role: "RECRUTEUR" } }), db.mission.count(), db.application.count(), db.skill.count(), db.workExperience.count()
  ]);
  return { workers,recruiters,missions,applications,skills:skillCount,experiences };
}

function missionStatus(index) {
  const value = index % 20;
  if (value < 2) return "COMPLETED";
  if (value < 4) return "FULL";
  if (value === 4) return "CLOSED";
  if (value === 5) return "CANCELLED";
  if (value === 6) return "DRAFT";
  if (value === 7) return "IN_PROGRESS";
  return "PUBLISHED";
}

async function resolveDatabase(confirmDev) {
  env.loadEnvConfig(root, true);
  const configured = process.env.DATABASE_URL;
  if (!configured?.startsWith("file:")) throw new Error("DATABASE_URL SQLite file: est requis.");
  const isDev = configured === "file:./dev.db";
  if (isDev && !confirmDev) throw new Error("Refus de modifier dev.db sans --confirm-dev.");
  const file = isDev ? path.join(directory, "dev.db") : configured.slice(5).replaceAll("/", path.sep);
  const resolved = await realpath(path.isAbsolute(file) ? file : path.resolve(directory, file));
  if (isDev && resolved !== path.join(directory, "dev.db")) throw new Error("Chemin dev.db inattendu.");
  if (isDev) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await copyFile(resolved, path.join(directory, "backups", `dev-before-ai-dataset-${stamp}.db`));
  }
  return `file:${resolved.replaceAll("\\", "/")}`;
}

export async function seedAiDataset({ confirmDev = false } = {}) {
  if (process.env.CI || process.env.VERCEL || process.env.VERCEL_ENV) throw new Error("Seed interdit en CI ou déploiement.");
  const url = await resolveDatabase(confirmDev);
  const db = new PrismaClient({ datasources: { db: { url } } });
  try {
    const before = await counts(db);
    const existingMarker = await db.notification.findFirst({ where: { message: marker }, select: { id: true } });
    if (existingMarker) return { before, after: before, idempotent: true, aiScenarios: ["excellent", "partiel", "incompatible", "conflit", "complète", "remplacement"] };
    const hashedPassword = await bcrypt.hash(testAccountPassword, 12);
    const today = Date.parse(`${new Date().toISOString().slice(0,10)}T00:00:00Z`);
    await db.$transaction(async tx => {
      const emailSet = new Set((await tx.user.findMany({ select: { email: true } })).map(item => item.email.toLowerCase()));
      const emailFor = (firstName, role) => { const base = `${slug(firstName)}.${role}@quickjob.com`; if (!emailSet.has(base)) { emailSet.add(base); return base; } let index = 2; while (emailSet.has(`${slug(firstName)}.${role}${index}@quickjob.com`)) index++; const value = `${slug(firstName)}.${role}${index}@quickjob.com`; emailSet.add(value); return value; };
      const recruiterDeficit = Math.max(0, targets.recruiters - before.recruiters), workerDeficit = Math.max(0, targets.workers - before.workers);
      const createdRecruiters = [];
      for (let i=0;i<recruiterDeficit;i++) {
        const [firstName,name] = recruiterPeople[i];
        const user = await tx.user.create({ data: { firstName,name,email:emailFor(firstName,"recruteur"),password:hashedPassword,role:"RECRUTEUR",phone:`+216 71 ${String(400000+i).slice(-6)}`,city:cities[i%cities.length],address:`${10+i} avenue Habib Bourguiba, ${cities[i%cities.length]}`,recruiterType:"COMPANY",companyName:companies[i],sector:domains[i%domains.length],bio:"Entreprise tunisienne fictive créée pour les scénarios de démonstration QuickJob.",avatarUrl:"/images/recruiter-illustration-v2.png" } });
        await tx.recruiterVerification.create({ data: { userId:user.id,status:i===recruiterDeficit-1?"EN_ATTENTE":"APPROUVE",requestedAt:new Date(today-30*day),decidedAt:i===recruiterDeficit-1?null:new Date(today-20*day) } });
        createdRecruiters.push(user);
      }
      const createdWorkers = [];
      for (let i=0;i<workerDeficit;i++) {
        const [firstName,name] = people[i], domain = domains[i%domains.length], city = cities[i%cities.length];
        createdWorkers.push(await tx.user.create({ data: { firstName,name,email:emailFor(firstName,"travailleur"),password:hashedPassword,role:"TRAVAILLEUR",phone:`+216 50 ${String(500000+i).slice(-6)}`,city,address:`${5+i} rue de la République, ${city}`,bio:`Profil fictif spécialisé en ${domain.toLocaleLowerCase("fr")}, disponible pour des missions ponctuelles en Tunisie.`,skills:skills.filter(item=>item[1]===domain).slice(0,4).map(item=>item[0]).join(", "),experience:`${1+i%5} ans d’expérience en ${domain.toLocaleLowerCase("fr")}.`,languages:i%3===0?"Arabe, Français, Anglais":"Arabe, Français",avatarUrl:"/images/worker-illustration-v2.png",recommendationOptIn:i%4!==0 } }));
      }
      const normalizedSkills = [];
      for (const [name] of skills) normalizedSkills.push(await tx.skill.upsert({ where:{key:key(name)},update:{name},create:{key:key(name),name} }));
      for (const category of domains) await tx.category.upsert({ where:{key:key(category)},update:{},create:{key:key(category),name:category} });
      const allWorkers = await tx.user.findMany({ where:{role:"TRAVAILLEUR",suspended:false},orderBy:{id:"asc"} });
      for (const [i,worker] of createdWorkers.entries()) {
        const domain = domains[i%domains.length], domainSkills = skills.map((item,index)=>({item,index})).filter(value=>value.item[1]===domain).slice(0,4);
        for (const value of domainSkills) await tx.workerSkill.upsert({ where:{workerId_skillId:{workerId:worker.id,skillId:normalizedSkills[value.index].id}},update:{},create:{workerId:worker.id,skillId:normalizedSkills[value.index].id,level:2+i%4,yearsOfExperience:1+i%5,source:"PROFILE"} });
        await tx.workerCategoryPreference.upsert({ where:{workerId_category:{workerId:worker.id,category:domain}},update:{},create:{workerId:worker.id,category:domain} });
        const offset = 2+i%18;
        await tx.availability.createMany({ data:[{workerId:worker.id,startAt:new Date(today+offset*day+8*3600000),endAt:new Date(today+offset*day+17*3600000),kind:"AVAILABLE",note:"Disponible sur la journée."},{workerId:worker.id,startAt:new Date(today+(35+i%12)*day+9*3600000),endAt:new Date(today+(35+i%12)*day+13*3600000),kind:"UNAVAILABLE",note:"Indisponibilité personnelle déclarée."}] });
      }
      const experienceDeficit = Math.max(0,targets.experiences-before.experiences);
      const experienceWorkers = createdWorkers.length ? createdWorkers : allWorkers;
      for (let i=0;i<experienceDeficit;i++) { const worker=experienceWorkers[i%experienceWorkers.length],domain=domains[i%domains.length],years=1+i%5; await tx.workExperience.create({data:{workerId:worker.id,title:`Expérience ${domain} ${String(i+1).padStart(3,"0")}`,category:domain,description:`Expérience fictive vérifiable : missions de ${domain.toLocaleLowerCase("fr")}, respect des consignes et travail avec une équipe locale.`,city:cities[(i+3)%cities.length],startedAt:new Date(Date.UTC(2025-years,i%12,1)),endedAt:i%6===0?null:new Date(Date.UTC(2025,(i+6)%12,1))}}); }
      const approvedRecruiters = await tx.user.findMany({ where:{role:"RECRUTEUR",suspended:false,recruiterVerification:{is:{status:"APPROUVE"}}},orderBy:{id:"asc"} });
      if (!approvedRecruiters.length) throw new Error("Aucun recruteur approuvé disponible pour les missions.");
      const missionDeficit = Math.max(0,targets.missions-before.missions), createdMissions=[];
      for (let i=0;i<missionDeficit;i++) {
        const domain=i===1||i===2?"Logistique":i===8||i===9?"Restauration":i===10?"Informatique":domains[i%domains.length],baseStatus=missionStatus(i),status=i<2?"PUBLISHED":baseStatus;
        const city=i===8||i===10?cities[0]:i===9?cities[8]:cities[(i*3)%cities.length],future=i>=8&&i<=10?2:i<3?10:2+i%45;
        const scenarioTitle=i===0?"Remplacement restauration":i===1?"Conflit horaire logistique":i===2?"Mission complète":i===8?"Excellent matching":i===9?"Matching partiel":i===10?"Incompatibilité":null;
        const mission=await tx.mission.create({data:{recruiterId:approvedRecruiters[i%approvedRecruiters.length].id,title:scenarioTitle??missionTitles[domain][i%3],description:`Mission fictive réaliste à ${city}. L’équipe attend ponctualité, respect des consignes et compétences pratiques en ${domain.toLocaleLowerCase("fr")}.`,status,category:domain,city,address:`${20+i} avenue de l’Indépendance, ${city}`,date:new Date(today+(status==="COMPLETED"?-(5+i%20):future)*day),startTime:i<3||i>=8&&i<=10?"09:00":i%3===0?"09:00":"14:00",endTime:i<3||i>=8&&i<=10?"13:00":i%3===0?"13:00":"18:00",pay:55+(i%8)*10,capacity:i===0?1:status==="FULL"?2:2+i%3,skills:skills.filter(item=>item[1]===domain).slice(0,2).map(item=>item[0]).join(", "),experience:i%4===0?"Une année d’expérience est souhaitée.":"Débutants accompagnés acceptés.",requiredExperienceMonths:i%4===0?12:null}});
        const wantedSkills=i===9?["Service en salle","Vente"]:skills.filter(item=>item[1]===domain).slice(0,2).map(item=>item[0]);
        const indices=wantedSkills.map(name=>({item:skills.find(item=>item[0]===name),index:skills.findIndex(item=>item[0]===name)}));
        for (const [position,value] of indices.entries()) await tx.missionSkill.create({data:{missionId:mission.id,skillId:normalizedSkills[value.index].id,required:position===0,weight:position===0?1.5:1}});
        createdMissions.push(mission);
      }
      const applicationDeficit=Math.max(0,targets.applications-before.applications), appData=[], used=new Set(), scenarioWorkers=createdWorkers.length>=5?createdWorkers:allWorkers;
      const add=(mission,worker,status,extra={})=>{const id=`${mission.id}:${worker.id}`;if(used.has(id)||appData.length>=applicationDeficit)return;used.add(id);appData.push({missionId:mission.id,workerId:worker.id,status,message:"Bonjour, mon profil correspond aux besoins de cette mission fictive QuickJob.",createdAt:new Date(today-2*day),...extra});};
      if (createdMissions.length>=3&&allWorkers.length>=5) {
        add(createdMissions[0],scenarioWorkers[0],"CANCELLED",{cancelledBy:"WORKER",cancelledAt:new Date(today-day),cancelledFromStatus:"ACCEPTED"});
        add(createdMissions[0],scenarioWorkers[1],"PENDING");
        add(createdMissions[1],scenarioWorkers[2],"PENDING");
        add(createdMissions[2],scenarioWorkers[2],"ACCEPTED");
      }
      for (const mission of createdMissions) {
        const acceptedNeeded=mission.status==="FULL"?mission.capacity:["COMPLETED","IN_PROGRESS"].includes(mission.status)?1:0;
        const alreadyAccepted=appData.filter(item=>item.missionId===mission.id&&item.status==="ACCEPTED").length;
        for(let n=0;n<Math.max(0,acceptedNeeded-alreadyAccepted);n++) add(mission,allWorkers[(mission.id+n)%allWorkers.length],"ACCEPTED");
      }
      let cursor=0;
      while(appData.length<applicationDeficit&&cursor<createdMissions.length*allWorkers.length*2){const mission=createdMissions[cursor%createdMissions.length],worker=allWorkers[(cursor*7+3)%allWorkers.length];let status;if(mission.status==="DRAFT") {cursor++;continue;} if(["CANCELLED"].includes(mission.status))status="CANCELLED";else if(mission.status==="CLOSED")status=cursor%2?"REJECTED":"CANCELLED";else status=["PENDING","REJECTED","CANCELLED"][cursor%3];add(mission,worker,status);cursor++;}
      if(appData.length<applicationDeficit) throw new Error(`Combinaisons insuffisantes pour ${applicationDeficit} candidatures.`);
      for(const data of appData) await tx.application.create({data});
      if(createdMissions[0]) {
        const cancelled=await tx.application.findFirst({where:{missionId:createdMissions[0].id,status:"CANCELLED",cancelledFromStatus:"ACCEPTED"}}),candidate=await tx.application.findFirst({where:{missionId:createdMissions[0].id,status:"PENDING"}});
        if(cancelled&&candidate) await tx.replacementOffer.create({data:{missionId:createdMissions[0].id,cancelledApplicationId:cancelled.id,applicationId:candidate.id,status:"PENDING",createdApplication:false,expiresAt:new Date(Date.now()+2*day)}});
      }
      const markerOwner=createdRecruiters[0]??approvedRecruiters[0];
      await tx.notification.create({data:{userId:markerOwner.id,kind:"ACCOUNT",message:marker,readAt:new Date()}});
    },{timeout:120000});
    const after=await counts(db);
    return {before,after,idempotent:false,aiScenarios:["excellent","partiel","incompatible","conflit","complète","remplacement"]};
  } finally { await db.$disconnect(); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  seedAiDataset({confirmDev:process.argv.includes("--confirm-dev")}).then(result=>console.log(JSON.stringify(result,null,2))).catch(error=>{console.error(error.message);process.exitCode=1;});
}
