* ✅ background should be random blurry photo
* ✅ fix setup to use new api abstraction
* ✅ merge pickfolderstore and setup store
* ✅ make global showError function that spawns a snackbar and logs it to console
* ✅ na register word je niet geredirect naar setup
* ✅ desync in ratios en photos
* ✅ main content is not taking up entire width
* ✅ search bar isn't centered
* ✅ er is ineens een transition als je de main page inlaad, de nav menu gaat van boven naar beneden
* ✅ WAAR IS DE TRANSITION
* ✅ maak virtual scroll met ratios.pb af
* ✅ probeer virtual scroll zonder alles van tevoren te laden
* ✅ probeer virtual scroll met ratios en v-virtual-scroll (we weten alle heights nu)
* ✅ border radius around every month grouping like i had before
* ✅ fix auth refresh token expire handling (is dit stuk?)
* ✅ ik kan nog een layout maken voor login/onboarding/register net zoals MainLayout.vue dat voor de main pages doet.
  Misschien
  met extra blurry etna BG
* ✅ if you quickly scroll/press next through viewphoto photos then it doesnt load full media item properly. Why? Also
  route seems to
  be wrong somehow. Doesnt match actual address in addressbalk
* ✅ in settings, add option to have solid color background, with fitting theme. or custom image as wallpaper with
  fitting theme.
* ✅ er klopt niks van de sync tussen scroll thumb en de year labels / month dots
* ✅ change scrollbar behaviour so dots and more scroll info is shown when scrolling
* ✅ you can't scroll to most recent photo with timeline scroll
* ✅ date overlay doesnt update if you click scroll to unloaded area in virtual scroller
* ✅ upper bound op tooltip
* ✅ fix scroll fps (is this possible?)
* ✅ volgens mij is fetchMediaByMonths shittylaggy als je hard scrollt
* ✅ on timeline, once loading of in view months in done, just loop until all months are loaded, starting with the ones
  near the viewed month
* ✅ don't push to history when next-ing trough photos in photoview
* ✅ refactor timeline into reusable photogrid
* ✅ support other sorting options for reusable timeline component
* ✅ support backend sort options
* ✅ vuetify discord vragen of het mogelijk is en nut heeft om alle item heights in een virtual scroll toe te voegen.
* ✅ make fetch months timelineStore function take ~0 ms on main thread.
* ✅ When processing image, link the image to a hash of the file + filename, so rebuilding is easy
* ✅ volgende stap: selectie in photo grid laten maken
* ✅ ctrl z voor selecties?
* ✅ only select multiple photos when holding ctrl
* ✅ only show selection-check when multiple photos are selected?
* ✅ deselect all with escape
* ✅ select all with ctrl+a
* ✅ review useTimelineSelection & selectionStore code & gridItem code.
* ✅ dont deselect all with escape when you're viewing big pic
* ✅ i need a selection overlay thing on photo grid
    * ✅ deselect all button
    * ✅ actions
    * ✅ can this integrate with date overlay?
* ✅ clean up selection code (composable & griditem)
* ✅ make way to view photo without losing selection
* ✅ copy google photos selection, and single click to open photos
* ✅ make select toggle in /view/ use the undo/redo dings
* ✅ make selection icon like in google photos
    * ✅ when nothing is selected; check in a filled circle, transparent
    * ✅ when something is selected, on an item that isnt selected: just a circle, with box shadow inset full color 2px
      line, and a box shadow outset half transparent 5px outline (both non-blur shadow)
    * ✅ when something is selected, on an item that is selected: check in a filled circle, full color, with box shadow
      outside half transparent (non-blur shadow)
* ✅ switching from album to album, ratios is kept or something?
* ✅ make click on photo open /album/d9faud9a/view/aduf0a
* ✅ make edit album title permanent in new album view
* ✅ on album title edit → update user albums
* ✅ make albums list in nav drawer not scrollable, and cut off at 5 items or so (maybe add view all button at the bottom
  of the list if theres more items available)
* ✅ remember if albums list in navbar is open with localstorage
* ✅ if an album has media items in it, but no title, then show it as <No Title> or something in the nav bar and the
  albums
  page
* ✅ timeline scrollbar is shitty when we have few media items
* ✅ make way to see time range of album (include in metadata with ratios request)
* ✅ only request main timeline ratios/ids/by-month if we're visiting the main timeline
* ✅ make date overlay hide when near the top of the page
* ✅ fix griditem rendering
* ✅ hij is weer shitty laggy lol waarom doet ie dat :((( bisect maar weer even ofzo
* ✅ [bug] scroll via timeline to some far away date → scroll up & down a bit → it janks to a month later? idk
* ✅ next: make add to album via selection work. make the UX nice. (also be able to add to existing album)
* ✅ when holding shift & selecting dont insta lose preview when not hovering a photo
* ✅ fix lag spike when moving from photos → explore → [LAG HERE] photos
* ✅ [BUG] als je voor preview selectie eerst hover op een item, en dan shift indrukt, komt de preview niet
* 🫸 remove theme per photo in /view/ (idk moet dit wel? wacht nog maar even)
* ✅ add way to add description
* ✅ als je weg gaat van timeline, en dan terugkomt moet je eigelijk naar dezelfde datum.
* ✅ als je pagina laad op een view photo, en dan uit de photo viewer gaat, moet je gescrollt zijn op de goeie plek (is
  nu stuk, en mogelijk conflict met scrollSession, misschien kan ik de view photo date en scroll session unifyen?)
* ✅ albums in search suggestions includen
* ✅ if you focus the searchbar and nothing is typed, show historic searches
* ✅ dont smooth scroll when returning from /view photo when the item it should scroll to is still fully in browser view.
* ✅ [BUG] after login, photo grid isnt loaded
* ✅ make loading indicator for search
* ✅ if you reload with ?query=asdf, make sure the search-bar is filled with that query on load.
* ✅ show more results on search page
* ✅ make proper search page
* ✅ search suggestions while typing (llm data required)
* ✅ show `Search "Greece"` in de search bar as placeholder
* ✅ filters kan wel een v-menu zijn met de filters UI erin
* ✅ search: is text field is empty, make sure null is sent
* ✅ search: filterDateRange moet obj zijn, niet een array of 2 items
* ✅ search: hij execute search 2x
* ✅ search: haal epilepsie aanval weg als je filter aanpast (misschien pas loading laten zien als t langer dan 500ms
  duurt, of als er 0 results zijn en loading true is.
* ✅ search: alleen month dots in date slider waar de months ook bestaan in de backend (pas backend aan)
* ✅ search: if startdate is earliest point, send null, if enddate is latest point, send null
* ✅ more interesting filters to search page (advanced search collapsable section)
    * ✅ face? maybe for later
    * ✅ location? country? could be autofilling select input thing
    * ✅ negative query?
* ✅ make search sortable by relevancy or date
* ✅ stomme nav bar start te hoog en animeert naar beneden on page load
* ✅ search: filters in url query zetten
* ✅ search: filter v-menu kan wel blurry bg krijgen, is leuk
* ✅ search: clean up UI for date range. If last date range is selected, show something like "Showing items
  from March 2019 until present", if start date range is set to first available month, then show: "Showing items until
  March 2019 or something", where march 2019 is the end filter in this case.
* ✅ add date range filter on search page (jan 2016 - now) (2 sided slider with min/max being first/last photo date, if
  all
  the way to the end, it should show "Until Jan 2023" or "From Dec 2018", otherwise "Jun 2019 - Dec 2021")
* ✅ misschien filter chips in de search pagina, rechts van Search for "photo", dan -> (Date: Jan 2018 - Dec 2026") (
  Photos) (Berber) (Albania, Greece or Morocco (of met vlaggetjes+tooltip?)), (Exclude: "orange")
* on login redirect to where you were
* standardize font sizes everywhere
* improve messaging when you load the website and the server is off
* make nav drawer collapsible, automatically make it small for smaller windows. Collapse to size of navbar in ruurd
  music
* [bug]: ratios.pb is refetched when you go from explore to photos, but the photos arent refreshed, so it can go
  out of sync (ratios & photos).
* make api.ts abstraction for protobuf endpoints.
* bad performance on firefox
* make func to refresh frontpage, call it after onboarding is done after 10s, then every 5s;
* view-option (like gmail), split view: if you single click a photo it opens in a right half of the window pane. Only
  works with enough screen width (desktop).
* implement frontend for share via registerProtocolHandler link
    * On login, Alice allows her website to register the protocol for photoshare://
    * bob wants to share album, generates share link: photos.bob.com/share?t=as8df89sad89asdf98, sends it to alice
        * as8df89sad89asdf98 contains bob's link, bob's username, and the secret token string.
    * alice opens link, finds public page on bobs frontend with a button to share the link: photoshare:
      as8df89sad89asdf98
    * alice's frontend automatically opens this and asks to import this album
* don't allow user to go to /onboarding if onboarding is done already.
* setting: usebackdropblur doesnt apply everywhere.
* preload 1440p thumbnail on grid item hover
* re-establish ws connection if auth failed and it's refreshed automatically afterwards
* add sort order to timeline controller and remove it as passed down prop, and use it in api requests through that prop
* ga alle grote refs objects langs om te zien of een shallowref voordeel zou geven
* idea to fix desync timeline bug:
    * bug: timeline ids/ratios/by month might by out of sync because theyre separate requests
    * possible solution: add a param: addedAtCutoff which is set by frontend at the currenttime of the first request.
    * this would prevent new photos being added in between the ratios and byMonth request
    * it doesnt prevent removals messing things up, but removals are done by UI interaction so that's less of a problem
* add snackbar when on-demand thumbnails are used, that it's slowe because the thumbnails havent been processed yet.
* album page: add sort (also sort by added on date)
* delete album button in albums page en op album page
* als een album geen thumbnail heeft ziet t er niet uit op /albums (oh dat komt omdat ie nog niet ingested is, en niet
  ondemand gebruikt denk ik)
* [BUG] kruisje linksboven op viewphoto is stuk op album page
* foto openen lijkt langzamer dan eerst. het is nu klik -> zwart scherm -> image laad
* ✅ max-width op album thumbnail zetten ofzo, anders verpest panorama t. Misschien max ratio op 16/9 zetten?
* als je helemaal bovenin de timeline op homepage bent, en gaat dan naar andere page, en komt dan terug, dan scrollt ie
  naar de 1e foto, en verdwijnt de "January" header text omdat ie er voorbij scrollt stiekem
* vuetify naar 4.0 geupdate:
    * ✅ Search for "kotor" <- die balk heeft random meer padding en is nu te hoog
    * ✅ De v-menu v-card van de filters op searchview heeft geen min width meer lijkt het
    * ✅ ik denk ook de verticale padding op de /albums page
    * ✅ teveel padding op month dividers in frontpage timeline
    * ✅ top balk in /view/{id} is lelijk geworden in t midden
    * ✅ album page meta info is niet meer goed, ook ergens teveel verticale padding
    * ✅ als je date range selecteerd shift de layout
    * migration guide: https://vuetifyjs.com/en/getting-started/upgrade-guide/#multi-step-migration
    * vergelijk met vuetify 3 zodat ik niet mooie ui kwijt raak