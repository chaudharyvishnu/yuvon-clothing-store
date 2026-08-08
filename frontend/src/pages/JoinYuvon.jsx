import { useState } from "react";

const jobs = [
  {
    id: 1,
    title: "Senior Social Media Manager",
    location: "Gurugram",
    experience: "4 - 6 years",
    type: "Full Time",
  },
  {
    id: 2,
    title: "Senior Creative Head",
    location: "Gurugram",
    experience: "5+ years",
    type: "Full Time",
  },
  {
    id: 3,
    title: "Lead Apparel Designer",
    location: "Gurugram",
    experience: "4+ years",
    type: "Full Time / Part Time",
  },
  {
    id: 4,
    title: "Marketplace Manager - Ecommerce",
    location: "Gurugram",
    experience: "3+ years",
    type: "Full Time",
  },
];

function JoinYuvon() {
  const [selectedJob, setSelectedJob] = useState("");

  return (
    <section className="bg-white min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-serif font-bold">
            Our Openings
          </h1>
          <p className="mt-5 text-xl font-medium">
            Be part of a growing D2C journey where your work truly matters
          </p>
        </div>

        <div className="space-y-5">
          {jobs.map((job) => (
            <div
              key={job.id}
              onClick={() => setSelectedJob(job.title)}
              className="border rounded-xl p-6 cursor-pointer hover:shadow-lg transition bg-white"
            >
              <h2 className="text-2xl font-serif font-bold">{job.title}</h2>

              <p className="mt-5 text-gray-500">
                📍 {job.location} · {job.experience} · {job.type}
              </p>
            </div>
          ))}
        </div>

        <div className="max-w-xl mx-auto mt-16">
          <h2 className="text-3xl font-bold text-center mb-8">
            Let’s Create Something Amazing Together!
          </h2>

          <form className="space-y-4">
            <input
              type="text"
              placeholder="Name"
              className="w-full border rounded-lg px-5 py-4 outline-none"
            />

            <input
              type="email"
              placeholder="Email"
              className="w-full border rounded-lg px-5 py-4 outline-none"
            />

            <div className="grid grid-cols-4 gap-3">
              <div className="border rounded-lg px-4 py-4 flex items-center justify-between">
                🇮🇳 <span>▼</span>
              </div>

              <input
                type="text"
                placeholder="Phone +91"
                className="col-span-3 border rounded-lg px-5 py-4 outline-none"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium">Choose Job Title</label>

              <select
                value={selectedJob}
                onChange={(e) => setSelectedJob(e.target.value)}
                className="w-full border rounded-lg px-5 py-4 outline-none"
              >
                <option value="">Select Job Title</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.title}>
                    {job.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-2 font-medium">Upload Your Resume</label>

              <div className="border-2 border-dashed rounded-lg h-32 flex items-center justify-center">
                <label className="bg-gray-100 px-5 py-3 rounded-lg cursor-pointer">
                  Add file
                  <input type="file" className="hidden" />
                </label>
              </div>
            </div>

            <button
              type="button"
              className="w-full bg-black text-white py-4 rounded-lg font-bold hover:bg-blue-600 transition"
            >
              Apply for this Job
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

export default JoinYuvon;