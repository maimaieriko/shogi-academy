/* world.js — the Toy Academy: areas, NPCs, quests, bosses, collectibles.
   All characters are original creations for this game. */
const World = (() => {

  const AREAS = [
    {
      id:'entrance', emoji:'🏫',
      name:{ja:'エントランスホール', en:'Entrance Hall'},
      desc:{ja:'ほこりをかぶった大広間。だれかが待っている…', en:'A dusty grand hall. Someone is waiting…'},
      sky:['#2B2545','#4A3A6B'], skyLit:['#FFE9C4','#FFD79A'], floor:'#6B4A2E', deco:'🏮🪔🌼',
      npc:{
        id:'bear', emoji:'🧸', name:{ja:'クマ先生', en:'Professor Bear'},
        lines:{
          greet:{ja:'おお…！ひさしぶりのお客さんじゃ。わしはクマ先生。この学園はむかし、将棋のまほうで光りかがやいておったんじゃよ。', en:'Oh…! A visitor at last. I am Professor Bear. Long ago this academy glowed with the magic of shogi.'},
          questOffer:{ja:'将棋の力がもどれば、学園に光がもどる。まずは駒の動きをおぼえてくれんかの？', en:'If the power of shogi returns, so will the light. Will you start by learning how the pieces move?'},
          questActive:{ja:'その調子じゃ！駒たちがきみを待っておるぞ。', en:'That\u2019s the spirit! The pieces are waiting for you.'},
          questComplete:{ja:'みごとじゃ！ほれ、天井のランプに光がともった！', en:'Splendid! Look — the ceiling lamps are glowing again!'},
          allDone:{ja:'きみのおかげで、ホールがあたたかくなったのう。', en:'Thanks to you, this hall feels warm again.'},
          daily:{ja:'毎日すこしずつ。それが強くなるひけつじゃよ。', en:'A little every day — that is the secret to strength.'}
        }
      },
      quests:[
        {id:'e1', cat:'move', count:3, restore:35, reward:{xp:30,coins:20},
         name:{ja:'駒の動きをおぼえよう', en:'Learn the pieces'},
         desc:{ja:'駒の動きレッスンを3問クリア', en:'Clear 3 movement lessons'}},
        {id:'e2', cat:'capture', count:2, restore:35, reward:{xp:30,coins:20},
         name:{ja:'はじめての駒取り', en:'First captures'},
         desc:{ja:'駒取りトレーニングを2問クリア', en:'Clear 2 capture drills'}}
      ],
      boss:{
        id:'toyknight', emoji:'🛡️', name:{ja:'おもちゃの騎士', en:'Toy Knight'},
        intro:{ja:'「この扉を通りたくば、将棋の心を見せてみよ！」', en:'"To pass this door, show me the heart of shogi!"'},
        win:{ja:'「みごと！きみこそ学園の希望だ」騎士は道をあけた。', en:'"Well fought! You are the academy\u2019s hope." The knight steps aside.'},
        puzzles:[{cat:'capture',diff:1},{cat:'move',diff:1},{cat:'capture',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'classroom', emoji:'🎒',
      name:{ja:'おもちゃの教室', en:'Toy Classroom'},
      desc:{ja:'小さなつくえがならぶ、ねむったままの教室。', en:'Rows of little desks, fast asleep.'},
      sky:['#2B2545','#3E3560'], skyLit:['#DFF3E8','#BDE8D2'], floor:'#7A5233', deco:'📚✏️🌷',
      npc:{
        id:'rabbit', emoji:'🐰', name:{ja:'とけいウサギのチクタク', en:'Ticktock the Clock Rabbit'},
        lines:{
          greet:{ja:'わわっ、生徒さん！？ぼくはチクタク。じゅぎょうの時間をずーっと待ってたんだ！', en:'Wah — a student?! I\u2019m Ticktock. I\u2019ve been waiting forever for class to start!'},
          questOffer:{ja:'黒板の駒たちがねむってるの。れんしゅうで起こしてあげて！', en:'The pieces on the blackboard are asleep. Wake them with practice!'},
          questActive:{ja:'チクタク、チクタク…きみならできるよ！', en:'Tick, tock… you can do it!'},
          questComplete:{ja:'やったー！お花がさいた！教室があかるくなったよ！', en:'Yay! Flowers are blooming! The classroom is bright again!'},
          allDone:{ja:'またいっしょにべんきょうしようね！', en:'Let\u2019s study together again!'},
          daily:{ja:'きょうの1問、もうといた？', en:'Did you solve today\u2019s puzzle yet?'}
        }
      },
      quests:[
        {id:'c1', cat:'move', count:4, restore:35, reward:{xp:40,coins:25},
         name:{ja:'動きマスターへの道', en:'Movement mastery'},
         desc:{ja:'駒の動きレッスンを4問クリア', en:'Clear 4 movement lessons'}},
        {id:'c2', cat:'capture', count:3, restore:35, reward:{xp:40,coins:25},
         name:{ja:'駒取り特訓', en:'Capture drills'},
         desc:{ja:'駒取りトレーニングを3問クリア', en:'Clear 3 capture drills'}}
      ],
      boss:{
        id:'rockinghorse', emoji:'🎠', name:{ja:'木馬の騎士', en:'Rocking-Horse Knight'},
        intro:{ja:'「ゆらゆら…わたしを目ざめさせたのはきみか。腕前を見せてもらおう！」', en:'"Creak, sway… so you woke me. Show me your skill!"'},
        win:{ja:'「あっぱれ！」木馬はうれしそうにゆれた。', en:'"Bravo!" The rocking horse sways happily.'},
        puzzles:[{cat:'capture',diff:2},{cat:'escape',diff:1},{cat:'capture',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'workshop', emoji:'🔧',
      name:{ja:'からくり工房', en:'Clockwork Workshop'},
      desc:{ja:'歯車とねじの山。ロボットが何かを直そうとしている。', en:'Mountains of gears and screws. A robot is fixing something.'},
      sky:['#2B2545','#463A55'], skyLit:['#FFE2C8','#FFC9A3'], floor:'#5E432B', deco:'⚙️🔩🛠️',
      npc:{
        id:'robot', emoji:'🤖', name:{ja:'ロボット大工のガタゴン', en:'Gatagon the Robot Carpenter'},
        lines:{
          greet:{ja:'ウィーン…ヨウコソ。ワタシ、ガタゴン。学園ヲ、ナオシテイマス。', en:'Whirr… WELCOME. I AM GATAGON. I REPAIR THE ACADEMY.'},
          questOffer:{ja:'守リノ技ト、駒取リノ技。リョウホウ、ヒツヨウデス。', en:'DEFENSE SKILLS AND CAPTURE SKILLS. BOTH REQUIRED.'},
          questActive:{ja:'ガンバッテ。ワタシ、オウエン、シテイマス。', en:'KEEP GOING. I AM CHEERING… QUIETLY.'},
          questComplete:{ja:'シュウリ、カンリョウ！アリガトウ、トモダチ。', en:'REPAIR COMPLETE! THANK YOU, FRIEND.'},
          allDone:{ja:'キミハ、リッパナ、ショウギ・エンジニア。', en:'YOU ARE A FINE SHOGI ENGINEER.'},
          daily:{ja:'マイニチノ、テイレガ、ダイジ。', en:'DAILY MAINTENANCE IS IMPORTANT.'}
        }
      },
      quests:[
        {id:'w1', cat:'escape', count:2, restore:35, reward:{xp:45,coins:30},
         name:{ja:'王様をまもれ', en:'Protect the king'},
         desc:{ja:'守りのとっくんを2問クリア', en:'Clear 2 defense drills'}},
        {id:'w2', cat:'capture', count:3, restore:35, reward:{xp:45,coins:30},
         name:{ja:'部品あつめ', en:'Gathering parts'},
         desc:{ja:'駒取りトレーニングを3問クリア', en:'Clear 3 capture drills'}}
      ],
      boss:{
        id:'windupgeneral', emoji:'🗜️', name:{ja:'ぜんまい将軍', en:'Wind-Up General'},
        intro:{ja:'「ガシャン！わが工房を通るなら、実戦の知恵を見せい！」', en:'"CLANK! To cross my workshop, show me practical wisdom!"'},
        win:{ja:'「見事な腕前…ぜんまいが巻き直された気分だ！」', en:'"Masterful… I feel wound up anew!"'},
        puzzles:[{cat:'capture',diff:2},{cat:'best',diff:2},{cat:'escape',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'library', emoji:'📚',
      name:{ja:'魔法の図書館', en:'Magic Library'},
      desc:{ja:'本が空をとぶ図書館。ちしきの香りがする。', en:'A library of flying books. It smells of knowledge.'},
      sky:['#241F3D','#3A3158'], skyLit:['#E8E0FF','#CFC3F5'], floor:'#4E3A63', deco:'📖🕯️✨',
      npc:{
        id:'owl', emoji:'🦉', name:{ja:'まほう図書館長ホウロウ', en:'Horo the Owl Librarian'},
        lines:{
          greet:{ja:'ホウホウ…静かに、でも熱心に。それが学びの心得ですぞ。', en:'Hoo hoo… quietly but keenly. That is the way of learning.'},
          questOffer:{ja:'序盤の知恵と、最善の一手。古い本にすべて書いてあります。読み解いてごらんなさい。', en:'Opening wisdom and best moves — the old books hold it all. Decipher them.'},
          questActive:{ja:'ホウ…よい目つきになってきましたな。', en:'Hoo… your eyes are getting sharper.'},
          questComplete:{ja:'本たちがよろこんで宙を舞っておる！', en:'The books are dancing with joy!'},
          allDone:{ja:'知恵はきみの中に。いつでも読み返しにおいでなさい。', en:'The wisdom is within you now. Return anytime.'},
          daily:{ja:'きょうも1ページ、進みましたかな？', en:'Have you turned today\u2019s page?'}
        }
      },
      quests:[
        {id:'l1', cat:'opening', count:3, restore:35, reward:{xp:50,coins:30},
         name:{ja:'序盤の書', en:'Book of openings'},
         desc:{ja:'序盤レッスンを3問クリア', en:'Clear 3 opening lessons'}},
        {id:'l2', cat:'best', count:2, restore:35, reward:{xp:50,coins:30},
         name:{ja:'最善手の巻物', en:'Scroll of best moves'},
         desc:{ja:'最善手さがしを2問クリア', en:'Clear 2 best-move puzzles'}}
      ],
      boss:{
        id:'grimoire', emoji:'📕', name:{ja:'本の精グリモワール', en:'Grimoire the Book Spirit'},
        intro:{ja:'「ペラペラ…わたしのページに書かれた試練、解けるかな？」', en:'"Flip, flip… can you solve the trials written on my pages?"'},
        win:{ja:'「すばらしい読みだ！」グリモワールは金の栞をくれた。', en:'"What splendid reading!" Grimoire gifts you a golden bookmark.'},
        puzzles:[{cat:'opening',diff:1},{cat:'best',diff:2},{cat:'mate1',diff:1}]
      },
      restoreBoss:30
    },
    {
      id:'clocktower', emoji:'🕰️',
      name:{ja:'時計塔', en:'Clock Tower'},
      desc:{ja:'止まった大時計。時をうごかすのは…きみの一手。', en:'The great clock is stopped. Your move can restart time.'},
      sky:['#1F2440','#324066'], skyLit:['#CFE8FF','#A8D4F5'], floor:'#54606E', deco:'🕰️⏳🌙',
      npc:{
        id:'crane', emoji:'🕊️', name:{ja:'おりがみヅルのハクバ', en:'Hakuba the Paper Crane'},
        lines:{
          greet:{ja:'カサ…コソ…。ようこそ、時のとまった塔へ。わたしは千年おりづる。', en:'Rustle… welcome to the tower where time stands still. I am a thousand-year crane.'},
          questOffer:{ja:'「詰み」— 王様をつかまえる最後の一手。それが時計の針を動かすカギです。', en:'"Checkmate" — the final move that catches the king. It is the key that moves the clock\u2019s hands.'},
          questActive:{ja:'一手一手、ていねいに。時はにげません。', en:'Move by move, carefully. Time will not run away.'},
          questComplete:{ja:'カチ、コチ…！時計がうごきだした！', en:'Tick… tock…! The clock is moving!'},
          allDone:{ja:'きみの一手が、時をとりもどしたのです。', en:'Your moves brought time back.'},
          daily:{ja:'きょうの詰将棋は、もう？', en:'Today\u2019s tsume puzzle — done yet?'}
        }
      },
      quests:[
        {id:'t1', cat:'mate1', count:3, restore:35, reward:{xp:60,coins:35},
         name:{ja:'詰みの感覚', en:'Sense of mate'},
         desc:{ja:'1手詰めを3問クリア', en:'Clear 3 mate-in-1 puzzles'}},
        {id:'t2', cat:'mate1', count:2, restore:35, reward:{xp:60,coins:35},
         name:{ja:'針をすすめて', en:'Advance the hands'},
         desc:{ja:'1手詰めをさらに2問クリア', en:'Clear 2 more mate-in-1 puzzles'}}
      ],
      boss:{
        id:'clockkeeper', emoji:'⏰', name:{ja:'時計の守り人', en:'Keeper of the Clock'},
        intro:{ja:'「時をうごかす資格、たしかめさせてもらう！」', en:'"Prove you are worthy of moving time itself!"'},
        win:{ja:'ゴーン…！大時計が高らかに鳴った。', en:'GONG…! The great clock rings out proudly.'},
        puzzles:[{cat:'mate1',diff:1},{cat:'mate1',diff:2},{cat:'mate1',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'garden', emoji:'🌷',
      name:{ja:'忘れられた庭', en:'Forgotten Garden'},
      desc:{ja:'枯れた花だん。でも土の下で、なにかが待っている。', en:'Withered flowerbeds — but something waits beneath the soil.'},
      sky:['#232B3B','#37504A'], skyLit:['#DFF7D8','#B8ECC9'], floor:'#4F6B3A', deco:'🌸🌻🦋',
      npc:{
        id:'fox', emoji:'🦊', name:{ja:'おりがみギツネのコンパチ', en:'Konpachi the Origami Fox'},
        lines:{
          greet:{ja:'コンコン！おっ、うわさの見習いさんだね。この庭、ぼくの宝ものなんだ。', en:'Kon kon! Oh, the rumored apprentice! This garden is my treasure.'},
          questOffer:{ja:'駒を取って栄養に、詰みの一手で水やりを！…たとえ話だけどね！', en:'Captures for nutrients, mates for watering! …Metaphorically, of course!'},
          questActive:{ja:'コン！その調子、その調子！', en:'Kon! That\u2019s the way!'},
          questComplete:{ja:'見て！花がさいた！ぼく、なみだ出てきちゃった…', en:'Look! Flowers! I\u2019m… I\u2019m tearing up…'},
          allDone:{ja:'庭がこんなにきれいになるなんて。ありがとう！', en:'I never dreamed the garden could look like this. Thank you!'},
          daily:{ja:'きょうも水やり（＝1問）よろしくね！', en:'Don\u2019t forget today\u2019s watering (one puzzle)!'}
        }
      },
      quests:[
        {id:'g1', cat:'capture', count:3, restore:35, reward:{xp:60,coins:35},
         name:{ja:'庭の栄養あつめ', en:'Garden nutrients'},
         desc:{ja:'駒取りトレーニングを3問クリア', en:'Clear 3 capture drills'}},
        {id:'g2', cat:'mate1', count:2, restore:35, reward:{xp:60,coins:35},
         name:{ja:'つぼみをひらく一手', en:'The move that blooms'},
         desc:{ja:'1手詰めを2問クリア', en:'Clear 2 mate-in-1 puzzles'}}
      ],
      boss:{
        id:'dragonpuppet', emoji:'🐉', name:{ja:'竜のあやつり人形', en:'Dragon Marionette'},
        intro:{ja:'「シャーッ！この庭の主はわたし。糸を切りたくば、知恵を見せよ！」', en:'"Hsss! I rule this garden. Show wisdom if you would cut my strings!"'},
        win:{ja:'糸がほどけ、人形はやさしい目になった。「…ありがとう」', en:'The strings loosen; the puppet\u2019s eyes soften. "…Thank you."'},
        puzzles:[{cat:'mate1',diff:2},{cat:'best',diff:2},{cat:'mate1',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'musichall', emoji:'🎵',
      name:{ja:'音楽ホール', en:'Music Hall'},
      desc:{ja:'ほこりをかぶったパイプオルガン。音がもどれば…', en:'A dusty pipe organ. If only its voice returned…'},
      sky:['#2A1F3D','#4A2E5C'], skyLit:['#FFE3F0','#F5C3E0'], floor:'#5C3A55', deco:'🎼🎻🎶',
      npc:{
        id:'cat', emoji:'🐱', name:{ja:'クリスタルキャットのルミナ', en:'Lumina the Crystal Cat'},
        lines:{
          greet:{ja:'にゃあ…あなた、いい「読み」の音がするわね。わたしはルミナ。', en:'Meow… you have the sound of good reading. I am Lumina.'},
          questOffer:{ja:'最善の一手はうつくしい和音、詰みはフィナーレ。ホールに音楽をとりもどして。', en:'A best move is a beautiful chord; a mate is the finale. Bring music back to this hall.'},
          questActive:{ja:'にゃん♪ いいテンポよ。', en:'Meow ♪ Nice tempo.'},
          questComplete:{ja:'きこえる…！ホールが歌っているわ！', en:'I can hear it…! The hall is singing!'},
          allDone:{ja:'あなたの一手は、もう立派な音楽ね。', en:'Your moves are music now.'},
          daily:{ja:'きょうの1曲（1問）、ひいていく？', en:'Play today\u2019s piece (puzzle)?'}
        }
      },
      quests:[
        {id:'m1', cat:'best', count:2, restore:35, reward:{xp:70,coins:40},
         name:{ja:'和音をさがして', en:'Finding the chord'},
         desc:{ja:'最善手さがしを2問クリア', en:'Clear 2 best-move puzzles'}},
        {id:'m2', cat:'mate1', count:3, restore:35, reward:{xp:70,coins:40},
         name:{ja:'フィナーレの練習', en:'Rehearsing the finale'},
         desc:{ja:'1手詰めを3問クリア', en:'Clear 3 mate-in-1 puzzles'}}
      ],
      boss:{
        id:'mirrorknight', emoji:'🪞', name:{ja:'ミラーナイト', en:'Mirror Knight'},
        intro:{ja:'「鏡のなかのわたしは、きみの読みをすべて映す。さあ、真の一手を！」', en:'"The mirror reflects your every plan. Now — show me the true move!"'},
        win:{ja:'鏡がすんだ音を立ててかがやいた。「完敗だ。美しい読みだった」', en:'The mirror chimes and shines. "I concede — beautiful reading."'},
        puzzles:[{cat:'mate1',diff:2},{cat:'best',diff:2},{cat:'escape',diff:2},{cat:'mate1',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'shrine', emoji:'⛩️',
      name:{ja:'竜の神社', en:'Dragon Shrine'},
      desc:{ja:'学園のいちばん奥。伝説の竜がねむる場所。', en:'The academy\u2019s deepest place, where the legendary dragon sleeps.'},
      sky:['#1C1530','#3A1F4A'], skyLit:['#FFE9D0','#FFD1A8'], floor:'#6E3A3A', deco:'🏮⛩️🌸',
      npc:{
        id:'dragon', emoji:'🐲', name:{ja:'こりゅうのタツマル', en:'Tatsumaru the Little Dragon'},
        lines:{
          greet:{ja:'ぴゃっ！？お、おどかさないでよ！…ぼく、竜のタツマル。ほんとはえらい守り神なんだから！', en:'Pyah!? D-don\u2019t scare me! …I\u2019m Tatsumaru the dragon. A very important guardian, actually!'},
          questOffer:{ja:'3手詰めがとければ、ご先祖さまの結界がとけるんだ。ぼくと特訓しよう！', en:'Solve mates-in-three and my ancestor\u2019s barrier will lift. Train with me!'},
          questActive:{ja:'3手先を読むんだよ。ぼくみたいなてんさいには朝めし前だけどね！', en:'Read three moves ahead! Easy for a genius like me, of course!'},
          questComplete:{ja:'すごい！きみ、ほんとに強くなったね…ぼくが育てたけど！', en:'Amazing! You\u2019ve gotten so strong… thanks to my coaching, obviously!'},
          allDone:{ja:'学長せんせいがきみを待ってるよ。がんばって！', en:'The Headmaster awaits you. Good luck!'},
          daily:{ja:'まいにちの積みかさねが、竜をもこえる力になるんだ。', en:'Daily practice builds power beyond even dragons.'}
        }
      },
      quests:[
        {id:'s1', cat:'mate3', count:2, restore:35, reward:{xp:90,coins:50},
         name:{ja:'3手の読み', en:'Reading three moves'},
         desc:{ja:'3手詰めを2問クリア', en:'Clear 2 mate-in-3 puzzles'}},
        {id:'s2', cat:'mate1', count:3, restore:35, reward:{xp:80,coins:45},
         name:{ja:'守り神の試練', en:'Guardian\u2019s trial'},
         desc:{ja:'1手詰めを3問クリア', en:'Clear 3 mate-in-1 puzzles'}}
      ],
      boss:{
        id:'headmaster', emoji:'👑', name:{ja:'いにしえの学長', en:'The Ancient Headmaster'},
        intro:{ja:'「よくぞここまで来た。わしは眠りにつく前、最後の生徒を待っておった。全力でかかってきなさい！」', en:'"You have come far. Before my long sleep I awaited one final student. Come at me with everything!"'},
        win:{ja:'「…みごと。学園の光は、きみに受けつがれた」学園ぜんたいが金色にかがやいた！', en:'"…Magnificent. The academy\u2019s light now lives in you." The whole academy blazes gold!'},
        puzzles:[{cat:'mate1',diff:2},{cat:'mate3',diff:3},{cat:'best',diff:3},{cat:'mate1',diff:3},{cat:'mate3',diff:3}]
      },
      restoreBoss:30
    }
  ];

  const ORDER = AREAS.map(a=>a.id);
  function area(id){ return AREAS.find(a=>a.id===id); }
  function next(id){ const i = ORDER.indexOf(id); return i>=0 && i<ORDER.length-1 ? ORDER[i+1] : null; }
  function questById(qid){
    for (const a of AREAS) for (const q of a.quests) if (q.id===qid) return {q, area:a};
    return null;
  }

  return { AREAS, ORDER, area, next, questById };
})();
