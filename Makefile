# PROTO_DIR=../proto
# OUT_DIR=./src/app/proto

# gen-protos:
# 	mkdir -p $(OUT_DIR)
# 	GRPC_PLUGIN=$(shell which grpc_node_plugin)
# 	GRPC_WEB_PLUGIN=$(shell ls node_modules/.bin/protoc-gen-grpc-web | head -1)
# 	protoc \
# 	  -I=$(PROTO_DIR) \
# 	  --js_out=import_style=commonjs,binary:$(OUT_DIR) \
# 	  --grpc_out=grpc_js:$(OUT_DIR) \
# 	  --grpc-web_out=import_style=typescript,mode=grpcwebtext:$(OUT_DIR) \
# 	  --plugin=protoc-gen-grpc=$$GRPC_PLUGIN \
# 	  --plugin=protoc-gen-grpc-web=$$GRPC_WEB_PLUGIN \
# 	  $(PROTO_DIR)/*.proto
# 	echo "Generated protos into $(OUT_DIR)"


# frontend/Makefile

# at the top, ensure CURDIR is set
ROOT        := $(CURDIR)
NODE_BIN    := $(ROOT)/node_modules/.bin

PROTO_DIR   := ./proto
OUT_DIR     := ./src/proto

# plugins by absolute path
JS_PLUGIN   := $(NODE_BIN)/protoc-gen-js
GRPC_PLUGIN := $(NODE_BIN)/grpc_tools_node_protoc_plugin
WEB_PLUGIN  := $(NODE_BIN)/protoc-gen-grpc-web

gen-protos:
	mkdir -p $(OUT_DIR)
	protoc \
	  -I=$(PROTO_DIR) \
	  --js_out=import_style=commonjs,binary:$(OUT_DIR) \
	  --plugin=protoc-gen-js=$(JS_PLUGIN) \
	  --grpc_out=grpc_js:$(OUT_DIR) \
	  --plugin=protoc-gen-grpc=$(GRPC_PLUGIN) \
	  --grpc-web_out=import_style=typescript,mode=grpcwebtext:$(OUT_DIR) \
	  --plugin=protoc-gen-grpc-web=$(WEB_PLUGIN) \
	  $(PROTO_DIR)/*.proto
	@echo "Protos generated into $(OUT_DIR)"


.PHONY: gen-protos build dev lint
