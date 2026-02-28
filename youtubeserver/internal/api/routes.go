package api

import (
	"log"
	"net/http"

	"github.com/gorilla/mux"
)

func (s *Server) Start(port string) error {
	r := mux.NewRouter()

	r.Use(s.loggingMiddleware)
	r.Use(s.corsMiddleware)

	r.HandleFunc("/api/streams", s.CreateStream).Methods("POST")
	r.HandleFunc("/api/streams", s.ListStreams).Methods("GET")
	r.HandleFunc("/api/streams/{id}", s.GetStream).Methods("GET")
	r.HandleFunc("/api/streams/{id}/health", s.GetStreamHealth).Methods("GET")

	r.PathPrefix("/streams/").Handler(
		http.StripPrefix("/streams/", http.FileServer(http.Dir("./streams"))),
	)

	log.Println("🌐 HTTP API starting on :" + port)
	log.Println("🔧 API endpoints:")
	log.Println("   POST   http://localhost:" + port + "/api/streams")
	log.Println("   GET    http://localhost:" + port + "/api/streams")
	log.Println("   GET    http://localhost:" + port + "/api/streams/{id}")
	log.Println("   GET    http://localhost:" + port + "/api/streams/{id}/health")

	return http.ListenAndServe("0.0.0.0:"+port, r)
}