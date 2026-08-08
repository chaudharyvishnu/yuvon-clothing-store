const reels = [
  {
    id: 1,
    title: "Streetwear Drop",
    video: "https://videos.pexels.com/video-files/853889/853889-hd_1920_1080_25fps.mp4",
  },
  {
    id: 2,
    title: "Summer Look",
    video: "https://videos.pexels.com/video-files/9771226/9771226-uhd_1440_2560_25fps.mp4",
  },
  {
    id: 3,
    title: "Yuvon Style",
    video: "https://videos.pexels.com/video-files/7677331/7677331-uhd_1440_2560_25fps.mp4",
  },
];

function MediaShowcase() {
  return (
    <section className="bg-white py-16">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-10">
          <p className="text-blue-600 font-semibold">Yuvon Reels</p>

          <h2 className="text-4xl md:text-5xl font-bold mt-2">
            Shop The Look
          </h2>

          <p className="text-gray-500 mt-3">
            Watch latest styling videos and discover premium fashion looks.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {reels.map((reel) => (
            <div
              key={reel.id}
              className="relative rounded-3xl overflow-hidden shadow-xl bg-black group"
            >
              <video
                src={reel.video}
                autoPlay
                muted
                loop
                playsInline
                controls
                className="w-full h-[620px] object-cover"
              />

              <div className="absolute left-0 right-0 bottom-0 p-5 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white text-xl font-bold">
                  {reel.title}
                </h3>

                <button className="mt-3 bg-white text-black px-5 py-2 rounded-full font-semibold hover:bg-blue-600 hover:text-white transition">
                  Shop Now
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default MediaShowcase;