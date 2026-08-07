// cao du lieu itune 
const {PrismaClient} = require('@prisma/client');
const axios = require('axios');
const prisma = new PrismaClient();

// danh sach tu khoa bai hat/ ca si keo tu db ve
const SEARCH_KEYWORDS = ['son tung mtp', 'taylor swift','lofi chill','charlie puth'];
async function main(){
    console.log('Seeding data from itunes API...');
    //xoa du lieu de tranh trung lap
    await prisma.playlistSong.deleteMany();
    await prisma.song.deleteMany();

    for(const keyword of SEARCH_KEYWORDS){
        try{
            // call itunes API
            const response = await axios.get(
                `https://itunes.apple.com/search?term=${encodeURIComponent(keyword)}&media=music&limit=5`
            );
            const tracks = response.data.results;
            for ( const track of tracks){
                // transform album cover width and height
                const highResCover = track.artworkUrl100
                ? track.artworkUrl100.replace('100x100bb', '600x600bb')
                : '';

                // push the song to the db
                await prisma.song.create({
                    data:{
                        title: track.trackName || 'Unknown Title',
                        artist: track.artistName || 'Unknown Artist',
                        albumCover:highResCover,
                        audioURL:track.previewUrl,
                        duration:track.trackTimeMillis ? Math.floor(track.trackTimeMillis / 1000) : 30,
                    },
                });
            
            }
            console.log(`Add song with key : "${keyword}"`);

        }catch(error){
            console.error(`Error when seeding data for key ${keyword}:`,error.message);
        }

    }
    console.log("Seed data completed");
}
main()
.catch((e) =>{
    console.error(e);
    process.exit(1);
})
.finally(async () =>{
    await prisma.$disconnect();
});