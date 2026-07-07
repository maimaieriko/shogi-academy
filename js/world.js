/* world.js — the Toy Academy: areas, NPCs, quests, bosses, collectibles.
   All characters are original creations for this game.
   本文はひらがな中心（将棋用語は漢字のまま）。ID・数値は変更禁止（セーブ互換）。 */
const World = (() => {

  const AREAS = [
    {
      id:'entrance', emoji:'🏫',
      name:{ja:'エントランスホール', en:'Entrance Hall'},
      desc:{ja:'ほこりをかぶったおおひろま。だれかがまっている…', en:'A dusty grand hall. Someone is waiting…'},
      sky:['#2B2545','#4A3A6B'], skyLit:['#FFE9C4','#FFD79A'], floor:'#6B4A2E', deco:'🏮🪔🌼',
      npc:{
        id:'bear', emoji:'🧸', name:{ja:'クマせんせい', en:'Professor Bear'},
        lines:{
          greet:{ja:'おお…！ひさしぶりのおきゃくさんじゃ。わしはクマせんせい。このがくえんはむかし、将棋のまほうでひかりかがやいておったんじゃよ。', en:'Oh…! A visitor at last. I am Professor Bear. Long ago this academy glowed with the magic of shogi.'},
          questOffer:{ja:'将棋のちからがもどれば、がくえんにひかりがもどる。まずは駒のうごきをおぼえてくれんかの？', en:'If the power of shogi returns, so will the light. Will you start by learning how the pieces move?'},
          questActive:{ja:'そのちょうしじゃ！駒たちがきみをまっておるぞ。', en:'That\u2019s the spirit! The pieces are waiting for you.'},
          questComplete:{ja:'みごとじゃ！ほれ、てんじょうのランプにひかりがともった！', en:'Splendid! Look — the ceiling lamps are glowing again!'},
          allDone:{ja:'きみのおかげで、ホールがあたたかくなったのう。', en:'Thanks to you, this hall feels warm again.'},
          daily:{ja:'まいにちすこしずつ。それがつよくなるひけつじゃよ。', en:'A little every day — that is the secret to strength.'}
        }
      },
      quests:[
        {id:'e1', cat:'move', count:3, restore:35, reward:{xp:30,coins:20},
         name:{ja:'駒のうごきをおぼえよう', en:'Learn the pieces'},
         desc:{ja:'駒のうごきレッスンを3もんクリア', en:'Clear 3 movement lessons'}},
        {id:'e2', cat:'capture', count:2, restore:35, reward:{xp:30,coins:20},
         name:{ja:'はじめての駒とり', en:'First captures'},
         desc:{ja:'駒とりトレーニングを2もんクリア', en:'Clear 2 capture drills'}}
      ],
      boss:{
        id:'toyknight', emoji:'🛡️', name:{ja:'おもちゃのきし', en:'Toy Knight'},
        intro:{ja:'「このとびらをとおりたくば、将棋のこころをみせてみよ！」', en:'"To pass this door, show me the heart of shogi!"'},
        win:{ja:'「みごと！きみこそがくえんのきぼうだ」きしはみちをあけた。', en:'"Well fought! You are the academy\u2019s hope." The knight steps aside.'},
        puzzles:[{cat:'capture',diff:1},{cat:'move',diff:1},{cat:'capture',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'classroom', emoji:'🎒',
      name:{ja:'おもちゃのきょうしつ', en:'Toy Classroom'},
      desc:{ja:'ちいさなつくえがならぶ、ねむったままのきょうしつ。', en:'Rows of little desks, fast asleep.'},
      sky:['#2B2545','#3E3560'], skyLit:['#DFF3E8','#BDE8D2'], floor:'#7A5233', deco:'📚✏️🌷',
      npc:{
        id:'rabbit', emoji:'🐰', name:{ja:'とけいウサギのチクタク', en:'Ticktock the Clock Rabbit'},
        lines:{
          greet:{ja:'わわっ、せいとさん！？ぼくはチクタク。じゅぎょうのじかんをずーっとまってたんだ！', en:'Wah — a student?! I\u2019m Ticktock. I\u2019ve been waiting forever for class to start!'},
          questOffer:{ja:'こくばんの駒たちがねむってるの。れんしゅうでおこしてあげて！', en:'The pieces on the blackboard are asleep. Wake them with practice!'},
          questActive:{ja:'チクタク、チクタク…きみならできるよ！', en:'Tick, tock… you can do it!'},
          questComplete:{ja:'やったー！おはながさいた！きょうしつがあかるくなったよ！', en:'Yay! Flowers are blooming! The classroom is bright again!'},
          allDone:{ja:'またいっしょにべんきょうしようね！', en:'Let\u2019s study together again!'},
          daily:{ja:'きょうの1もん、もうといた？', en:'Did you solve today\u2019s puzzle yet?'}
        }
      },
      quests:[
        {id:'c1', cat:'move', count:4, restore:35, reward:{xp:40,coins:25},
         name:{ja:'うごきマスターへのみち', en:'Movement mastery'},
         desc:{ja:'駒のうごきレッスンを4もんクリア', en:'Clear 4 movement lessons'}},
        {id:'c2', cat:'capture', count:3, restore:35, reward:{xp:40,coins:25},
         name:{ja:'駒とりとっくん', en:'Capture drills'},
         desc:{ja:'駒とりトレーニングを3もんクリア', en:'Clear 3 capture drills'}}
      ],
      boss:{
        id:'rockinghorse', emoji:'🎠', name:{ja:'もくばのきし', en:'Rocking-Horse Knight'},
        intro:{ja:'「ゆらゆら…わたしをめざめさせたのはきみか。うでまえをみせてもらおう！」', en:'"Creak, sway… so you woke me. Show me your skill!"'},
        win:{ja:'「あっぱれ！」もくばはうれしそうにゆれた。', en:'"Bravo!" The rocking horse sways happily.'},
        puzzles:[{cat:'capture',diff:2},{cat:'escape',diff:1},{cat:'capture',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'workshop', emoji:'🔧',
      name:{ja:'からくりこうぼう', en:'Clockwork Workshop'},
      desc:{ja:'はぐるまとねじのやま。ロボットがなにかをなおそうとしている。', en:'Mountains of gears and screws. A robot is fixing something.'},
      sky:['#2B2545','#463A55'], skyLit:['#FFE2C8','#FFC9A3'], floor:'#5E432B', deco:'⚙️🔩🛠️',
      npc:{
        id:'robot', emoji:'🤖', name:{ja:'ロボットだいくのガタゴン', en:'Gatagon the Robot Carpenter'},
        lines:{
          greet:{ja:'ウィーン…ヨウコソ。ワタシ、ガタゴン。ガクエンヲ、ナオシテイマス。', en:'Whirr… WELCOME. I AM GATAGON. I REPAIR THE ACADEMY.'},
          questOffer:{ja:'マモリノワザト、駒トリノワザ。リョウホウ、ヒツヨウデス。', en:'DEFENSE SKILLS AND CAPTURE SKILLS. BOTH REQUIRED.'},
          questActive:{ja:'ガンバッテ。ワタシ、オウエン、シテイマス。', en:'KEEP GOING. I AM CHEERING… QUIETLY.'},
          questComplete:{ja:'シュウリ、カンリョウ！アリガトウ、トモダチ。', en:'REPAIR COMPLETE! THANK YOU, FRIEND.'},
          allDone:{ja:'キミハ、リッパナ、ショウギ・エンジニア。', en:'YOU ARE A FINE SHOGI ENGINEER.'},
          daily:{ja:'マイニチノ、テイレガ、ダイジ。', en:'DAILY MAINTENANCE IS IMPORTANT.'}
        }
      },
      quests:[
        {id:'w1', cat:'escape', count:2, restore:35, reward:{xp:45,coins:30},
         name:{ja:'王様をまもれ', en:'Protect the king'},
         desc:{ja:'まもりのとっくんを2もんクリア', en:'Clear 2 defense drills'}},
        {id:'w2', cat:'capture', count:3, restore:35, reward:{xp:45,coins:30},
         name:{ja:'ぶひんあつめ', en:'Gathering parts'},
         desc:{ja:'駒とりトレーニングを3もんクリア', en:'Clear 3 capture drills'}}
      ],
      boss:{
        id:'windupgeneral', emoji:'🗜️', name:{ja:'ぜんまいしょうぐん', en:'Wind-Up General'},
        intro:{ja:'「ガシャン！わがこうぼうをとおるなら、じっせんのちえをみせい！」', en:'"CLANK! To cross my workshop, show me practical wisdom!"'},
        win:{ja:'「みごとなうでまえ…ぜんまいがまきなおされたきぶんだ！」', en:'"Masterful… I feel wound up anew!"'},
        puzzles:[{cat:'capture',diff:2},{cat:'best',diff:2},{cat:'escape',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'library', emoji:'📚',
      name:{ja:'まほうのとしょかん', en:'Magic Library'},
      desc:{ja:'ほんがそらをとぶとしょかん。ちしきのかおりがする。', en:'A library of flying books. It smells of knowledge.'},
      sky:['#241F3D','#3A3158'], skyLit:['#E8E0FF','#CFC3F5'], floor:'#4E3A63', deco:'📖🕯️✨',
      npc:{
        id:'owl', emoji:'🦉', name:{ja:'としょかんちょうのホウロウ', en:'Horo the Owl Librarian'},
        lines:{
          greet:{ja:'ホウホウ…しずかに、でもねっしんに。それがまなびのこころえですぞ。', en:'Hoo hoo… quietly but keenly. That is the way of learning.'},
          questOffer:{ja:'序盤のちえと、さいぜんの一手。ふるいほんにすべてかいてあります。よみといてごらんなさい。', en:'Opening wisdom and best moves — the old books hold it all. Decipher them.'},
          questActive:{ja:'ホウ…よいめつきになってきましたな。', en:'Hoo… your eyes are getting sharper.'},
          questComplete:{ja:'ほんたちがよろこんでそらをまっておる！', en:'The books are dancing with joy!'},
          allDone:{ja:'ちえはきみのなかに。いつでもよみかえしにおいでなさい。', en:'The wisdom is within you now. Return anytime.'},
          daily:{ja:'きょうも1ページ、すすみましたかな？', en:'Have you turned today\u2019s page?'}
        }
      },
      quests:[
        {id:'l1', cat:'opening', count:3, restore:35, reward:{xp:50,coins:30},
         name:{ja:'序盤のほん', en:'Book of openings'},
         desc:{ja:'序盤レッスンを3もんクリア', en:'Clear 3 opening lessons'}},
        {id:'l2', cat:'best', count:2, restore:35, reward:{xp:50,coins:30},
         name:{ja:'さいぜんの一手のまきもの', en:'Scroll of best moves'},
         desc:{ja:'さいぜんの一手さがしを2もんクリア', en:'Clear 2 best-move puzzles'}}
      ],
      boss:{
        id:'grimoire', emoji:'📕', name:{ja:'ほんのせいグリモワール', en:'Grimoire the Book Spirit'},
        intro:{ja:'「ペラペラ…わたしのページにかかれたしれん、とけるかな？」', en:'"Flip, flip… can you solve the trials written on my pages?"'},
        win:{ja:'「すばらしいよみだ！」グリモワールはきんいろのしおりをくれた。', en:'"What splendid reading!" Grimoire gifts you a golden bookmark.'},
        puzzles:[{cat:'opening',diff:1},{cat:'best',diff:2},{cat:'mate1',diff:1}]
      },
      restoreBoss:30
    },
    {
      id:'clocktower', emoji:'🕰️',
      name:{ja:'とけいとう', en:'Clock Tower'},
      desc:{ja:'とまったおおどけい。ときをうごかすのは…きみの一手。', en:'The great clock is stopped. Your move can restart time.'},
      sky:['#1F2440','#324066'], skyLit:['#CFE8FF','#A8D4F5'], floor:'#54606E', deco:'🕰️⏳🌙',
      npc:{
        id:'crane', emoji:'🕊️', name:{ja:'おりがみヅルのハクバ', en:'Hakuba the Paper Crane'},
        lines:{
          greet:{ja:'カサ…コソ…。ようこそ、ときのとまったとうへ。わたしはせんねんおりづる。', en:'Rustle… welcome to the tower where time stands still. I am a thousand-year crane.'},
          questOffer:{ja:'「詰み」— 王様をつかまえるさいごの一手。それがとけいのはりをうごかすカギです。', en:'"Checkmate" — the final move that catches the king. It is the key that moves the clock\u2019s hands.'},
          questActive:{ja:'一手一手、ていねいに。ときはにげません。', en:'Move by move, carefully. Time will not run away.'},
          questComplete:{ja:'カチ、コチ…！とけいがうごきだした！', en:'Tick… tock…! The clock is moving!'},
          allDone:{ja:'きみの一手が、ときをとりもどしたのです。', en:'Your moves brought time back.'},
          daily:{ja:'きょうの詰将棋は、もう？', en:'Today\u2019s tsume puzzle — done yet?'}
        }
      },
      quests:[
        {id:'t1', cat:'mate1', count:3, restore:35, reward:{xp:60,coins:35},
         name:{ja:'詰みのかんかく', en:'Sense of mate'},
         desc:{ja:'1手詰めを3もんクリア', en:'Clear 3 mate-in-1 puzzles'}},
        {id:'t2', cat:'mate1', count:2, restore:35, reward:{xp:60,coins:35},
         name:{ja:'はりをすすめて', en:'Advance the hands'},
         desc:{ja:'1手詰めをさらに2もんクリア', en:'Clear 2 more mate-in-1 puzzles'}}
      ],
      boss:{
        id:'clockkeeper', emoji:'⏰', name:{ja:'とけいのばんにん', en:'Keeper of the Clock'},
        intro:{ja:'「ときをうごかすしかく、たしかめさせてもらう！」', en:'"Prove you are worthy of moving time itself!"'},
        win:{ja:'ゴーン…！おおどけいがたからかになった。', en:'GONG…! The great clock rings out proudly.'},
        puzzles:[{cat:'mate1',diff:1},{cat:'mate1',diff:2},{cat:'mate1',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'garden', emoji:'🌷',
      name:{ja:'わすれられたにわ', en:'Forgotten Garden'},
      desc:{ja:'かれたはなだん。でもつちのしたで、なにかがまっている。', en:'Withered flowerbeds — but something waits beneath the soil.'},
      sky:['#232B3B','#37504A'], skyLit:['#DFF7D8','#B8ECC9'], floor:'#4F6B3A', deco:'🌸🌻🦋',
      npc:{
        id:'fox', emoji:'🦊', name:{ja:'おりがみギツネのコンパチ', en:'Konpachi the Origami Fox'},
        lines:{
          greet:{ja:'コンコン！おっ、うわさのみならいさんだね。このにわ、ぼくのたからものなんだ。', en:'Kon kon! Oh, the rumored apprentice! This garden is my treasure.'},
          questOffer:{ja:'駒をとってえいように、詰みの一手でみずやりを！…たとえばなしだけどね！', en:'Captures for nutrients, mates for watering! …Metaphorically, of course!'},
          questActive:{ja:'コン！そのちょうし、そのちょうし！', en:'Kon! That\u2019s the way!'},
          questComplete:{ja:'みて！はながさいた！ぼく、なみだがでてきちゃった…', en:'Look! Flowers! I\u2019m… I\u2019m tearing up…'},
          allDone:{ja:'にわがこんなにきれいになるなんて。ありがとう！', en:'I never dreamed the garden could look like this. Thank you!'},
          daily:{ja:'きょうもみずやり（＝1もん）よろしくね！', en:'Don\u2019t forget today\u2019s watering (one puzzle)!'}
        }
      },
      quests:[
        {id:'g1', cat:'capture', count:3, restore:35, reward:{xp:60,coins:35},
         name:{ja:'にわのえいようあつめ', en:'Garden nutrients'},
         desc:{ja:'駒とりトレーニングを3もんクリア', en:'Clear 3 capture drills'}},
        {id:'g2', cat:'mate1', count:2, restore:35, reward:{xp:60,coins:35},
         name:{ja:'つぼみをひらく一手', en:'The move that blooms'},
         desc:{ja:'1手詰めを2もんクリア', en:'Clear 2 mate-in-1 puzzles'}}
      ],
      boss:{
        id:'dragonpuppet', emoji:'🐉', name:{ja:'竜のあやつりにんぎょう', en:'Dragon Marionette'},
        intro:{ja:'「シャーッ！このにわのぬしはわたし。いとをきりたくば、ちえをみせよ！」', en:'"Hsss! I rule this garden. Show wisdom if you would cut my strings!"'},
        win:{ja:'いとがほどけ、にんぎょうはやさしいめになった。「…ありがとう」', en:'The strings loosen; the puppet\u2019s eyes soften. "…Thank you."'},
        puzzles:[{cat:'mate1',diff:2},{cat:'best',diff:2},{cat:'mate1',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'musichall', emoji:'🎵',
      name:{ja:'おんがくホール', en:'Music Hall'},
      desc:{ja:'ほこりをかぶったパイプオルガン。おとがもどれば…', en:'A dusty pipe organ. If only its voice returned…'},
      sky:['#2A1F3D','#4A2E5C'], skyLit:['#FFE3F0','#F5C3E0'], floor:'#5C3A55', deco:'🎼🎻🎶',
      npc:{
        id:'cat', emoji:'🐱', name:{ja:'クリスタルキャットのルミナ', en:'Lumina the Crystal Cat'},
        lines:{
          greet:{ja:'にゃあ…あなた、いい「よみ」のおとがするわね。わたしはルミナ。', en:'Meow… you have the sound of good reading. I am Lumina.'},
          questOffer:{ja:'さいぜんの一手はうつくしいわおん、詰みはフィナーレ。ホールにおんがくをとりもどして。', en:'A best move is a beautiful chord; a mate is the finale. Bring music back to this hall.'},
          questActive:{ja:'にゃん♪ いいテンポよ。', en:'Meow ♪ Nice tempo.'},
          questComplete:{ja:'きこえる…！ホールがうたっているわ！', en:'I can hear it…! The hall is singing!'},
          allDone:{ja:'あなたの一手は、もうりっぱなおんがくね。', en:'Your moves are music now.'},
          daily:{ja:'きょうの1きょく（1もん）、ひいていく？', en:'Play today\u2019s piece (puzzle)?'}
        }
      },
      quests:[
        {id:'m1', cat:'best', count:2, restore:35, reward:{xp:70,coins:40},
         name:{ja:'わおんをさがして', en:'Finding the chord'},
         desc:{ja:'さいぜんの一手さがしを2もんクリア', en:'Clear 2 best-move puzzles'}},
        {id:'m2', cat:'mate1', count:3, restore:35, reward:{xp:70,coins:40},
         name:{ja:'フィナーレのれんしゅう', en:'Rehearsing the finale'},
         desc:{ja:'1手詰めを3もんクリア', en:'Clear 3 mate-in-1 puzzles'}}
      ],
      boss:{
        id:'mirrorknight', emoji:'🪞', name:{ja:'ミラーナイト', en:'Mirror Knight'},
        intro:{ja:'「かがみのなかのわたしは、きみのよみをすべてうつす。さあ、ほんとうの一手を！」', en:'"The mirror reflects your every plan. Now — show me the true move!"'},
        win:{ja:'かがみがすんだおとをたててかがやいた。「まけたよ。うつくしいよみだった」', en:'The mirror chimes and shines. "I concede — beautiful reading."'},
        puzzles:[{cat:'mate1',diff:2},{cat:'best',diff:2},{cat:'escape',diff:2},{cat:'mate1',diff:2}]
      },
      restoreBoss:30
    },
    {
      id:'shrine', emoji:'⛩️',
      name:{ja:'竜のじんじゃ', en:'Dragon Shrine'},
      desc:{ja:'がくえんのいちばんおく。でんせつの竜がねむるばしょ。', en:'The academy\u2019s deepest place, where the legendary dragon sleeps.'},
      sky:['#1C1530','#3A1F4A'], skyLit:['#FFE9D0','#FFD1A8'], floor:'#6E3A3A', deco:'🏮⛩️🌸',
      npc:{
        id:'dragon', emoji:'🐲', name:{ja:'こりゅうのタツマル', en:'Tatsumaru the Little Dragon'},
        lines:{
          greet:{ja:'ぴゃっ！？お、おどかさないでよ！…ぼく、竜のタツマル。ほんとはえらいまもりがみなんだから！', en:'Pyah!? D-don\u2019t scare me! …I\u2019m Tatsumaru the dragon. A very important guardian, actually!'},
          questOffer:{ja:'3手詰めがとければ、ごせんぞさまのバリアがとけるんだ。ぼくととっくんしよう！', en:'Solve mates-in-three and my ancestor\u2019s barrier will lift. Train with me!'},
          questActive:{ja:'3手さきをよむんだよ。ぼくみたいなてんさいにはあさめしまえだけどね！', en:'Read three moves ahead! Easy for a genius like me, of course!'},
          questComplete:{ja:'すごい！きみ、ほんとにつよくなったね…ぼくがそだてたけど！', en:'Amazing! You\u2019ve gotten so strong… thanks to my coaching, obviously!'},
          allDone:{ja:'がくちょうせんせいがきみをまってるよ。がんばって！', en:'The Headmaster awaits you. Good luck!'},
          daily:{ja:'まいにちのつみかさねが、竜をもこえるちからになるんだ。', en:'Daily practice builds power beyond even dragons.'}
        }
      },
      quests:[
        {id:'s1', cat:'mate3', count:2, restore:35, reward:{xp:90,coins:50},
         name:{ja:'3手のよみ', en:'Reading three moves'},
         desc:{ja:'3手詰めを2もんクリア', en:'Clear 2 mate-in-3 puzzles'}},
        {id:'s2', cat:'mate1', count:3, restore:35, reward:{xp:80,coins:45},
         name:{ja:'まもりがみのしれん', en:'Guardian\u2019s trial'},
         desc:{ja:'1手詰めを3もんクリア', en:'Clear 3 mate-in-1 puzzles'}}
      ],
      boss:{
        id:'headmaster', emoji:'👑', name:{ja:'いにしえのがくちょう', en:'The Ancient Headmaster'},
        intro:{ja:'「よくぞここまできた。わしはねむりにつくまえ、さいごのせいとをまっておった。ぜんりょくでかかってきなさい！」', en:'"You have come far. Before my long sleep I awaited one final student. Come at me with everything!"'},
        win:{ja:'「…みごと。がくえんのひかりは、きみにうけつがれた」がくえんぜんたいがきんいろにかがやいた！', en:'"…Magnificent. The academy\u2019s light now lives in you." The whole academy blazes gold!'},
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
