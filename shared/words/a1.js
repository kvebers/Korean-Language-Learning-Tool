// A1 vocabulary. Format: one word per line, "korean|english|pos|emoji"; "@topic" starts a topic.
// pos: n noun, v verb, adj adjective, adv adverb, pron pronoun, num number, cnt counter, det determiner, exp expression.
// Order matters: words unlock in this order (see shared/vocab.js).
(window.KLT = window.KLT || {}).WORD_DATA = (KLT.WORD_DATA || []).concat([["A1", `
@greet
안녕하세요|hello|exp|👋
감사합니다|thank you|exp|🙏
네|yes|exp
아니요|no|exp
죄송합니다|I'm sorry|exp
괜찮아요|it's okay|exp|👌
안녕히 가세요|goodbye (to someone leaving)|exp
안녕히 계세요|goodbye (when you leave)|exp
고맙습니다|thank you|exp
미안합니다|sorry|exp
실례합니다|excuse me|exp
반갑습니다|nice to meet you|exp|🤝
어서 오세요|welcome|exp
잠깐만요|just a moment|exp
주세요|please give me|exp
여보세요|hello (on the phone)|exp|📞
축하합니다|congratulations|exp|🎉
잘 자요|good night|exp|🌙
맛있게 드세요|enjoy your meal|exp

@people
저|I (polite)|pron
나|I, me|pron
너|you (casual)|pron
우리|we, our|pron
저희|we (polite)|pron
사람|person|n|🧑
남자|man|n|👨
여자|woman|n|👩
아이|child|n|🧒
친구|friend|n|🧑‍🤝‍🧑
학생|student|n|🧑‍🎓
선생님|teacher|n|🧑‍🏫
이름|name|n|📛
나라|country|n|🌏
한국|Korea|n|🇰🇷
한국 사람|Korean (person)|n
외국인|foreigner|n
아저씨|middle-aged man, mister|n
아주머니|middle-aged woman, ma'am|n
씨|Mr./Ms. (after a name)|n

@question
이것|this (thing)|pron
그것|that (thing)|pron
저것|that thing over there|pron
여기|here|pron
거기|there|pron
저기|over there|pron
누구|who|pron
무엇|what|pron
뭐|what (casual)|pron
어디|where|pron
언제|when|pron
왜|why|adv
어떻게|how|adv
얼마|how much|n
몇|how many|det
어느|which|det

@family
가족|family|n|👪
아버지|father|n|👨
어머니|mother|n|👩
아빠|dad|n
엄마|mom|n
부모님|parents|n
형|older brother (of a male)|n
오빠|older brother (of a female)|n
누나|older sister (of a male)|n
언니|older sister (of a female)|n
동생|younger sibling|n
남동생|younger brother|n
여동생|younger sister|n
할아버지|grandfather|n|👴
할머니|grandmother|n|👵
아들|son|n
딸|daughter|n
남편|husband|n
아내|wife|n
아기|baby|n|👶

@food
음식|food|n|🍲
밥|rice; meal|n|🍚
빵|bread|n|🍞
고기|meat|n|🥩
김치|kimchi|n
라면|ramen|n|🍜
사과|apple; apology|n|🍎
바나나|banana|n|🍌
계란|egg|n|🥚
과일|fruit|n|🍇
딸기|strawberry|n|🍓
포도|grapes|n|🍇
수박|watermelon|n|🍉
귤|tangerine|n|🍊
배|pear; stomach; ship|n|🍐
야채|vegetables|n|🥬
채소|vegetables|n|🥦
감자|potato|n|🥔
양파|onion|n|🧅
당근|carrot|n|🥕
토마토|tomato|n|🍅
달걀|egg|n|🥚
치즈|cheese|n|🧀
버터|butter|n|🧈
소고기|beef|n|🥩
돼지고기|pork|n|🥓
닭고기|chicken (meat)|n|🍗
생선|fish (food)|n|🐟
떡|rice cake|n|🍡
떡볶이|spicy rice cakes|n
비빔밥|bibimbap (mixed rice)|n
불고기|bulgogi (marinated beef)|n
김밥|gimbap (seaweed rice roll)|n|🍙
국|soup|n|🍲
찌개|stew|n|🥘
반찬|side dish|n
소금|salt|n|🧂
설탕|sugar|n
아이스크림|ice cream|n|🍦
과자|snack, cookie|n|🍪
케이크|cake|n|🍰
피자|pizza|n|🍕
햄버거|hamburger|n|🍔
샌드위치|sandwich|n|🥪

@drink
물|water|n|💧
우유|milk|n|🥛
커피|coffee|n|☕
차|tea; car|n|🍵
주스|juice|n|🧃
콜라|cola|n|🥤
맥주|beer|n|🍺
술|alcohol|n|🍶
소주|soju|n
와인|wine|n|🍷

@number
일|one (Sino-Korean); work; day|num
이|two (Sino-Korean); tooth|num
삼|three (Sino-Korean)|num
사|four (Sino-Korean)|num
오|five (Sino-Korean)|num
육|six (Sino-Korean)|num
칠|seven (Sino-Korean)|num
팔|eight (Sino-Korean); arm|num
구|nine (Sino-Korean)|num
십|ten (Sino-Korean)|num
백|hundred|num
천|thousand|num
만|ten thousand|num
영|zero|num
하나|one (native)|num
둘|two (native)|num
셋|three (native)|num
넷|four (native)|num
다섯|five (native)|num
여섯|six (native)|num
일곱|seven (native)|num
여덟|eight (native)|num
아홉|nine (native)|num
열|ten (native); fever|num
스물|twenty (native)|num
명|people (counter)|cnt
살|years old (counter)|cnt
번|number, times (counter)|cnt
원|won (Korean currency)|cnt|💴
시|o'clock|cnt|🕐
권|books (counter)|cnt
잔|cups, glasses (counter)|cnt
병|bottle (counter); illness|cnt|🍾
장|sheets (counter)|cnt
마리|animals (counter)|cnt

@time
시간|time; hour|n|⏰
분|minute; person (polite)|n
초|second|n
오늘|today|n
어제|yesterday|n
내일|tomorrow|n
지금|now|n
아침|morning; breakfast|n|🌅
점심|lunch; midday|n
저녁|evening; dinner|n|🌆
밤|night; chestnut|n|🌙
낮|daytime|n
오전|morning, a.m.|n
오후|afternoon, p.m.|n
날|day|n
주말|weekend|n
요일|day of the week|n
월요일|Monday|n
화요일|Tuesday|n
수요일|Wednesday|n
목요일|Thursday|n
금요일|Friday|n
토요일|Saturday|n
일요일|Sunday|n
월|month|n
년|year|n
달|month; moon|n|🌕
해|year; sun|n|☀️
생일|birthday|n|🎂
방학|school vacation|n
휴가|vacation, leave|n|🏖️
이번|this (time)|n
다음|next|n
지난|last, past|det
전|before|n
후|after|n
때|time, when|n
처음|the first time, beginning|n
요즘|these days|n
작년|last year|n
올해|this year|n
내년|next year|n
매일|every day|adv
항상|always|adv
자주|often|adv
가끔|sometimes|adv

@home
집|house, home|n|🏠
방|room|n|🚪
문|door|n|🚪
창문|window|n|🪟
침대|bed|n|🛏️
책상|desk|n
의자|chair|n|🪑
냉장고|refrigerator|n
텔레비전|television|n|📺
컴퓨터|computer|n|💻
전화|telephone|n|☎️
휴대폰|mobile phone|n|📱
시계|clock, watch|n|⌚
화장실|bathroom, toilet|n|🚽
부엌|kitchen|n
거실|living room|n|🛋️
컵|cup|n|🥤
접시|plate|n|🍽️
숟가락|spoon|n|🥄
젓가락|chopsticks|n|🥢
칼|knife|n|🔪
가방|bag|n|👜
열쇠|key|n|🔑
우산|umbrella|n|☂️
사진|photo|n|📷
책|book|n|📕
신문|newspaper|n|📰
편지|letter (mail)|n|✉️
선물|gift|n|🎁
돈|money|n|💰
물건|thing, item|n
것|thing|n
비누|soap|n|🧼
수건|towel|n

@place
학교|school|n|🏫
회사|company, office|n|🏢
병원|hospital|n|🏥
은행|bank|n|🏦
식당|restaurant|n|🍽️
가게|store, shop|n|🏪
시장|market|n
마트|supermarket|n|🛒
편의점|convenience store|n|🏪
백화점|department store|n
카페|café|n|☕
커피숍|coffee shop|n
도서관|library|n|📚
공원|park|n|🌳
우체국|post office|n|📮
약국|pharmacy|n|💊
영화관|movie theater|n|🎬
극장|theater|n|🎭
호텔|hotel|n|🏨
공항|airport|n|🛫
역|station|n|🚉
교회|church|n|⛪
대학교|university|n|🎓
교실|classroom|n
서울|Seoul|n|🏙️
도시|city|n|🏙️
시골|countryside|n
길|road, way|n|🛣️

@position
밖|outside|n
안|inside; not|n
위|top, above|n|⬆️
아래|bottom, below|n|⬇️
밑|under|n
앞|front|n
뒤|back, behind|n
옆|side, next to|n
오른쪽|right side|n|➡️
왼쪽|left side|n|⬅️
근처|nearby|n
사이|between; relationship|n
가운데|middle|n

@transport
버스|bus|n|🚌
지하철|subway|n|🚇
택시|taxi|n|🚕
기차|train|n|🚆
비행기|airplane|n|✈️
자전거|bicycle|n|🚲
자동차|car|n|🚗
표|ticket|n|🎫
정류장|bus stop|n|🚏

@body
몸|body|n
머리|head; hair|n
눈|eye; snow|n|👁️
코|nose|n|👃
입|mouth|n|👄
귀|ear|n|👂
얼굴|face|n|🙂
손|hand|n|✋
발|foot|n|🦶
다리|leg; bridge|n|🦵
머리카락|hair|n
목|neck, throat|n
허리|waist, lower back|n
어깨|shoulder|n

@weather
날씨|weather|n|🌤️
비|rain|n|🌧️
바람|wind|n|🌬️
구름|cloud|n|☁️
하늘|sky|n
봄|spring|n|🌸
여름|summer|n|🌞
가을|autumn|n|🍂
겨울|winter|n|⛄
춥다|to be cold|adj|🥶
덥다|to be hot|adj|🥵
따뜻하다|to be warm|adj
시원하다|to be cool, refreshing|adj
맑다|to be clear (sky)|adj
흐리다|to be cloudy|adj

@nature
산|mountain|n|⛰️
바다|sea|n|🌊
강|river|n
꽃|flower|n|🌸
나무|tree|n|🌳
돌|stone|n|🪨
불|fire; light|n|🔥
별|star|n|⭐

@animal
동물|animal|n
개|dog; (counter for things)|n|🐕
고양이|cat|n|🐈
강아지|puppy|n|🐶
새|bird; new|n|🐦
물고기|fish (animal)|n|🐠
소|cow|n|🐄
돼지|pig|n|🐷
닭|chicken|n|🐔
말|horse; language, words|n|🐴
토끼|rabbit|n|🐰
호랑이|tiger|n|🐯
곰|bear|n|🐻

@color
색|color|n|🎨
색깔|color|n
빨간색|red|n|🔴
파란색|blue|n|🔵
노란색|yellow|n|🟡
초록색|green|n|🟢
검은색|black|n|⚫
하얀색|white|n|⚪
흰색|white|n
분홍색|pink|n|🌸
보라색|purple|n|🟣
갈색|brown|n|🟤
회색|gray|n

@clothes
옷|clothes|n|👕
바지|pants|n|👖
치마|skirt|n
셔츠|shirt|n|👔
티셔츠|T-shirt|n|👕
신발|shoes|n|👟
구두|dress shoes|n|👞
모자|hat|n|🧢
양말|socks|n|🧦
안경|glasses|n|👓
코트|coat|n|🧥
입다|to wear (clothes)|v
신다|to wear (shoes)|v
벗다|to take off|v

@school
공부|study|n
수업|class, lesson|n
숙제|homework|n|📝
시험|exam|n
연필|pencil|n|✏️
볼펜|ballpoint pen|n|🖊️
종이|paper|n|📄
공책|notebook|n|📓
한국어|Korean language|n
영어|English|n
글|writing|n
단어|word|n
문제|problem, question|n
질문|question|n|❓
대답|answer|n
반|class (group); half|n

@work
직업|job, occupation|n
회사원|office worker|n
의사|doctor|n|🧑‍⚕️
간호사|nurse|n
경찰|police|n|👮
요리사|cook, chef|n|🧑‍🍳
가수|singer|n|🎤
배우|actor|n

@hobby
취미|hobby|n
운동|exercise, sports|n|🏃
축구|soccer|n|⚽
야구|baseball|n|⚾
농구|basketball|n|🏀
수영|swimming|n|🏊
노래|song|n|🎵
음악|music|n|🎶
영화|movie|n|🎬
게임|game|n|🎮
여행|travel, trip|n|🧳
그림|picture, painting|n|🖼️
춤|dance|n|💃
등산|hiking|n|🥾
요리|cooking|n|🍳
쇼핑|shopping|n|🛍️

@routine
일어나다|to get up; to happen|v|⏰
씻다|to wash|v|🧼
세수하다|to wash one's face|v
닦다|to wipe, to brush (teeth)|v|🪥
샤워하다|to shower|v|🚿
먹다|to eat|v|🍽️
마시다|to drink|v|🥤
가다|to go|v|🚶
오다|to come|v
공부하다|to study|v|📚
일하다|to work|v|💼
운동하다|to exercise|v|🏋️
요리하다|to cook|v|🍳
청소하다|to clean|v|🧹
자다|to sleep|v|😴
쉬다|to rest|v|🛋️
보다|to see, to watch|v|👀
읽다|to read|v|📖
듣다|to listen|v|🎧
만나다|to meet|v|🤝
타다|to ride, to take (transport)|v|🚌
걷다|to walk|v|🚶
놀다|to play, to hang out|v|🎈

@action
하다|to do|v
말하다|to speak|v|🗣️
쓰다|to write; to use; to wear (a hat); to be bitter|v|✍️
사다|to buy|v|🛒
팔다|to sell|v
주다|to give|v|🎁
받다|to receive|v
있다|to exist, to have|v
없다|to not exist, to not have|v
좋아하다|to like|v|❤️
싫어하다|to dislike|v
알다|to know|v
모르다|to not know|v
배우다|to learn|v
가르치다|to teach|v
뛰다|to run, to jump|v|🏃
앉다|to sit|v|🪑
서다|to stand|v|🧍
기다리다|to wait|v|⏳
전화하다|to make a phone call|v|📞
사랑하다|to love|v|💕
만들다|to make|v
열다|to open|v
닫다|to close|v
켜다|to turn on|v|💡
끄다|to turn off|v
울다|to cry|v|😢
웃다|to laugh, to smile|v|😄
노래하다|to sing|v|🎤
춤추다|to dance|v|💃
여행하다|to travel|v|✈️
출발하다|to depart|v
도착하다|to arrive|v
들어가다|to go in|v
나가다|to go out|v
들어오다|to come in|v
나오다|to come out|v
돌아가다|to go back|v
살다|to live|v|🏡
생각하다|to think|v|🤔
찾다|to look for, to find|v|🔍
보내다|to send; to spend (time)|v
빌리다|to borrow|v
치다|to hit; to play (piano, tennis)|v
부르다|to call; to sing|v
시작하다|to start|v
끝나다|to end|v
준비하다|to prepare|v
바꾸다|to change, to exchange|v
되다|to become|v
물어보다|to ask|v
대답하다|to answer|v
이야기하다|to talk|v

@describe
좋다|to be good|adj|👍
나쁘다|to be bad|adj|👎
크다|to be big|adj
작다|to be small|adj
많다|to be many, a lot|adj
적다|to be few, little|adj
맛있다|to be delicious|adj|😋
맛없다|to taste bad|adj
재미있다|to be fun, interesting|adj
재미없다|to be boring|adj
비싸다|to be expensive|adj|💸
싸다|to be cheap|adj
예쁘다|to be pretty|adj
멋있다|to be cool, stylish|adj|😎
바쁘다|to be busy|adj
아프다|to be sick, to hurt|adj|🤒
배고프다|to be hungry|adj
배부르다|to be full (stomach)|adj
피곤하다|to be tired|adj|😩
기쁘다|to be glad|adj|😊
슬프다|to be sad|adj|😢
행복하다|to be happy|adj
길다|to be long|adj
짧다|to be short|adj
높다|to be high|adj
낮다|to be low|adj
멀다|to be far|adj
가깝다|to be near|adj
빠르다|to be fast|adj
느리다|to be slow|adj
쉽다|to be easy|adj
어렵다|to be difficult|adj
뜨겁다|to be hot (to the touch)|adj
차갑다|to be cold (to the touch)|adj
맵다|to be spicy|adj|🌶️
달다|to be sweet|adj
짜다|to be salty|adj
같다|to be the same|adj
다르다|to be different|adj
괜찮다|to be okay|adj
조용하다|to be quiet|adj
깨끗하다|to be clean|adj
더럽다|to be dirty|adj
무겁다|to be heavy|adj
가볍다|to be light (weight)|adj
넓다|to be wide, spacious|adj
좁다|to be narrow|adj
젊다|to be young|adj
친절하다|to be kind|adj
귀엽다|to be cute|adj

@adverb
아주|very|adv
정말|really|adv
진짜|really (casual)|adv
너무|too, very|adv
많이|a lot|adv
조금|a little|adv
좀|a little; please (softener)|adv
잘|well|adv
못|cannot|adv
다|all|adv
또|again, also|adv
다시|again|adv
같이|together|adv
빨리|quickly|adv
천천히|slowly|adv
먼저|first|adv
벌써|already|adv
아직|still, not yet|adv
제일|the most|adv
더|more|adv
그리고|and (then)|adv
그런데|but, by the way|adv
그래서|so, therefore|adv
하지만|but, however|adv
그러면|then, in that case|adv
혼자|alone|adv
모두|everyone, all|adv
일찍|early|adv
늦게|late|adv

@shop
가격|price|n
카드|card|n|💳
현금|cash|n|💵
`]]);
