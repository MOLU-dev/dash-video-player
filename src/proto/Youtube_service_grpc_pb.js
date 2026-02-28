// GENERATED CODE -- DO NOT EDIT!

'use strict';
var grpc = require('@grpc/grpc-js');
var google_protobuf_empty_pb = require('google-protobuf/google/protobuf/empty_pb.js');
var rpc_upload_pb = require('./rpc_upload_pb.js');
var session_pb = require('./session_pb.js');
var rpc_gif_pb = require('./rpc_gif_pb.js');
var rpc_Home_pb = require('./rpc_Home_pb.js');
var rpc_Channel_pb = require('./rpc_Channel_pb.js');
var rpc_stream_pb = require('./rpc_stream_pb.js');
var rpc_category_pb = require('./rpc_category_pb.js');
var rpc_search_pb = require('./rpc_search_pb.js');
var rpc_editvideo_pb = require('./rpc_editvideo_pb.js');
var rpc_comments_pb = require('./rpc_comments_pb.js');
var rpc_subscription_pb = require('./rpc_subscription_pb.js');
var rpc_reaction_pb = require('./rpc_reaction_pb.js');
var rpc_playlist_pb = require('./rpc_playlist_pb.js');
var rpc_preview_pb = require('./rpc_preview_pb.js');
var rpc_video_edit_pb = require('./rpc_video_edit_pb.js');
var rpc_streamLive_pb = require('./rpc_streamLive_pb.js');

function serialize_google_protobuf_Empty(arg) {
  if (!(arg instanceof google_protobuf_empty_pb.Empty)) {
    throw new Error('Expected argument of type google.protobuf.Empty');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_google_protobuf_Empty(buffer_arg) {
  return google_protobuf_empty_pb.Empty.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_AddItemRequest(arg) {
  if (!(arg instanceof rpc_playlist_pb.AddItemRequest)) {
    throw new Error('Expected argument of type pb.AddItemRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_AddItemRequest(buffer_arg) {
  return rpc_playlist_pb.AddItemRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_AutocompleteRequest(arg) {
  if (!(arg instanceof rpc_search_pb.AutocompleteRequest)) {
    throw new Error('Expected argument of type pb.AutocompleteRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_AutocompleteRequest(buffer_arg) {
  return rpc_search_pb.AutocompleteRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_AutocompleteResponse(arg) {
  if (!(arg instanceof rpc_search_pb.AutocompleteResponse)) {
    throw new Error('Expected argument of type pb.AutocompleteResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_AutocompleteResponse(buffer_arg) {
  return rpc_search_pb.AutocompleteResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ChannelRequest(arg) {
  if (!(arg instanceof rpc_Channel_pb.ChannelRequest)) {
    throw new Error('Expected argument of type pb.ChannelRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ChannelRequest(buffer_arg) {
  return rpc_Channel_pb.ChannelRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ChannelResponse(arg) {
  if (!(arg instanceof rpc_Channel_pb.ChannelResponse)) {
    throw new Error('Expected argument of type pb.ChannelResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ChannelResponse(buffer_arg) {
  return rpc_Channel_pb.ChannelResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_CheckAuthResponse(arg) {
  if (!(arg instanceof session_pb.CheckAuthResponse)) {
    throw new Error('Expected argument of type pb.CheckAuthResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_CheckAuthResponse(buffer_arg) {
  return session_pb.CheckAuthResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_Comment(arg) {
  if (!(arg instanceof rpc_comments_pb.Comment)) {
    throw new Error('Expected argument of type pb.Comment');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_Comment(buffer_arg) {
  return rpc_comments_pb.Comment.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_CreateCategoryRequest(arg) {
  if (!(arg instanceof rpc_category_pb.CreateCategoryRequest)) {
    throw new Error('Expected argument of type pb.CreateCategoryRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_CreateCategoryRequest(buffer_arg) {
  return rpc_category_pb.CreateCategoryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_CreateCategoryResponse(arg) {
  if (!(arg instanceof rpc_category_pb.CreateCategoryResponse)) {
    throw new Error('Expected argument of type pb.CreateCategoryResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_CreateCategoryResponse(buffer_arg) {
  return rpc_category_pb.CreateCategoryResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_CreateChannelRequest(arg) {
  if (!(arg instanceof rpc_Channel_pb.CreateChannelRequest)) {
    throw new Error('Expected argument of type pb.CreateChannelRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_CreateChannelRequest(buffer_arg) {
  return rpc_Channel_pb.CreateChannelRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_CreateChannelResponse(arg) {
  if (!(arg instanceof rpc_Channel_pb.CreateChannelResponse)) {
    throw new Error('Expected argument of type pb.CreateChannelResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_CreateChannelResponse(buffer_arg) {
  return rpc_Channel_pb.CreateChannelResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_CreatePlaylistRequest(arg) {
  if (!(arg instanceof rpc_playlist_pb.CreatePlaylistRequest)) {
    throw new Error('Expected argument of type pb.CreatePlaylistRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_CreatePlaylistRequest(buffer_arg) {
  return rpc_playlist_pb.CreatePlaylistRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_CreateSubcategoryRequest(arg) {
  if (!(arg instanceof rpc_category_pb.CreateSubcategoryRequest)) {
    throw new Error('Expected argument of type pb.CreateSubcategoryRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_CreateSubcategoryRequest(buffer_arg) {
  return rpc_category_pb.CreateSubcategoryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_CreateSubcategoryResponse(arg) {
  if (!(arg instanceof rpc_category_pb.CreateSubcategoryResponse)) {
    throw new Error('Expected argument of type pb.CreateSubcategoryResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_CreateSubcategoryResponse(buffer_arg) {
  return rpc_category_pb.CreateSubcategoryResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_DeleteCategoryRequest(arg) {
  if (!(arg instanceof rpc_category_pb.DeleteCategoryRequest)) {
    throw new Error('Expected argument of type pb.DeleteCategoryRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_DeleteCategoryRequest(buffer_arg) {
  return rpc_category_pb.DeleteCategoryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_DeleteCommentRequest(arg) {
  if (!(arg instanceof rpc_comments_pb.DeleteCommentRequest)) {
    throw new Error('Expected argument of type pb.DeleteCommentRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_DeleteCommentRequest(buffer_arg) {
  return rpc_comments_pb.DeleteCommentRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_DeletePlaylistRequest(arg) {
  if (!(arg instanceof rpc_playlist_pb.DeletePlaylistRequest)) {
    throw new Error('Expected argument of type pb.DeletePlaylistRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_DeletePlaylistRequest(buffer_arg) {
  return rpc_playlist_pb.DeletePlaylistRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_DeleteSubcategoryRequest(arg) {
  if (!(arg instanceof rpc_category_pb.DeleteSubcategoryRequest)) {
    throw new Error('Expected argument of type pb.DeleteSubcategoryRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_DeleteSubcategoryRequest(buffer_arg) {
  return rpc_category_pb.DeleteSubcategoryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_DeletesVideoRequest(arg) {
  if (!(arg instanceof rpc_editvideo_pb.DeletesVideoRequest)) {
    throw new Error('Expected argument of type pb.DeletesVideoRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_DeletesVideoRequest(buffer_arg) {
  return rpc_editvideo_pb.DeletesVideoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_DeletesVideoResponse(arg) {
  if (!(arg instanceof rpc_editvideo_pb.DeletesVideoResponse)) {
    throw new Error('Expected argument of type pb.DeletesVideoResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_DeletesVideoResponse(buffer_arg) {
  return rpc_editvideo_pb.DeletesVideoResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_EditCommentRequest(arg) {
  if (!(arg instanceof rpc_comments_pb.EditCommentRequest)) {
    throw new Error('Expected argument of type pb.EditCommentRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_EditCommentRequest(buffer_arg) {
  return rpc_comments_pb.EditCommentRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_EditeVideoDetailsRequest(arg) {
  if (!(arg instanceof rpc_editvideo_pb.EditeVideoDetailsRequest)) {
    throw new Error('Expected argument of type pb.EditeVideoDetailsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_EditeVideoDetailsRequest(buffer_arg) {
  return rpc_editvideo_pb.EditeVideoDetailsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetChannelResponse(arg) {
  if (!(arg instanceof rpc_Channel_pb.GetChannelResponse)) {
    throw new Error('Expected argument of type pb.GetChannelResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetChannelResponse(buffer_arg) {
  return rpc_Channel_pb.GetChannelResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetCommentCountRequest(arg) {
  if (!(arg instanceof rpc_comments_pb.GetCommentCountRequest)) {
    throw new Error('Expected argument of type pb.GetCommentCountRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetCommentCountRequest(buffer_arg) {
  return rpc_comments_pb.GetCommentCountRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetCommentCountResponse(arg) {
  if (!(arg instanceof rpc_comments_pb.GetCommentCountResponse)) {
    throw new Error('Expected argument of type pb.GetCommentCountResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetCommentCountResponse(buffer_arg) {
  return rpc_comments_pb.GetCommentCountResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetEditStatusRequest(arg) {
  if (!(arg instanceof rpc_video_edit_pb.GetEditStatusRequest)) {
    throw new Error('Expected argument of type pb.GetEditStatusRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetEditStatusRequest(buffer_arg) {
  return rpc_video_edit_pb.GetEditStatusRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetEditStatusResponse(arg) {
  if (!(arg instanceof rpc_video_edit_pb.GetEditStatusResponse)) {
    throw new Error('Expected argument of type pb.GetEditStatusResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetEditStatusResponse(buffer_arg) {
  return rpc_video_edit_pb.GetEditStatusResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetGifRequest(arg) {
  if (!(arg instanceof rpc_gif_pb.GetGifRequest)) {
    throw new Error('Expected argument of type pb.GetGifRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetGifRequest(buffer_arg) {
  return rpc_gif_pb.GetGifRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetGifResponse(arg) {
  if (!(arg instanceof rpc_gif_pb.GetGifResponse)) {
    throw new Error('Expected argument of type pb.GetGifResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetGifResponse(buffer_arg) {
  return rpc_gif_pb.GetGifResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetLiveEdgeRequest(arg) {
  if (!(arg instanceof rpc_streamLive_pb.GetLiveEdgeRequest)) {
    throw new Error('Expected argument of type pb.GetLiveEdgeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetLiveEdgeRequest(buffer_arg) {
  return rpc_streamLive_pb.GetLiveEdgeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetLiveEdgeResponse(arg) {
  if (!(arg instanceof rpc_streamLive_pb.GetLiveEdgeResponse)) {
    throw new Error('Expected argument of type pb.GetLiveEdgeResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetLiveEdgeResponse(buffer_arg) {
  return rpc_streamLive_pb.GetLiveEdgeResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetPlaylistRequest(arg) {
  if (!(arg instanceof rpc_playlist_pb.GetPlaylistRequest)) {
    throw new Error('Expected argument of type pb.GetPlaylistRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetPlaylistRequest(buffer_arg) {
  return rpc_playlist_pb.GetPlaylistRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetRepliesRequest(arg) {
  if (!(arg instanceof rpc_comments_pb.GetRepliesRequest)) {
    throw new Error('Expected argument of type pb.GetRepliesRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetRepliesRequest(buffer_arg) {
  return rpc_comments_pb.GetRepliesRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetRepliesResponse(arg) {
  if (!(arg instanceof rpc_comments_pb.GetRepliesResponse)) {
    throw new Error('Expected argument of type pb.GetRepliesResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetRepliesResponse(buffer_arg) {
  return rpc_comments_pb.GetRepliesResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetVideoDetailRequest(arg) {
  if (!(arg instanceof rpc_editvideo_pb.GetVideoDetailRequest)) {
    throw new Error('Expected argument of type pb.GetVideoDetailRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetVideoDetailRequest(buffer_arg) {
  return rpc_editvideo_pb.GetVideoDetailRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetVideosRequest(arg) {
  if (!(arg instanceof rpc_Home_pb.GetVideosRequest)) {
    throw new Error('Expected argument of type pb.GetVideosRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetVideosRequest(buffer_arg) {
  return rpc_Home_pb.GetVideosRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_GetVideosResponse(arg) {
  if (!(arg instanceof rpc_Home_pb.GetVideosResponse)) {
    throw new Error('Expected argument of type pb.GetVideosResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_GetVideosResponse(buffer_arg) {
  return rpc_Home_pb.GetVideosResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_LikeCommentRequest(arg) {
  if (!(arg instanceof rpc_reaction_pb.LikeCommentRequest)) {
    throw new Error('Expected argument of type pb.LikeCommentRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_LikeCommentRequest(buffer_arg) {
  return rpc_reaction_pb.LikeCommentRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_LikeCommentResponse(arg) {
  if (!(arg instanceof rpc_reaction_pb.LikeCommentResponse)) {
    throw new Error('Expected argument of type pb.LikeCommentResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_LikeCommentResponse(buffer_arg) {
  return rpc_reaction_pb.LikeCommentResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ListCategoriesResponse(arg) {
  if (!(arg instanceof rpc_category_pb.ListCategoriesResponse)) {
    throw new Error('Expected argument of type pb.ListCategoriesResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ListCategoriesResponse(buffer_arg) {
  return rpc_category_pb.ListCategoriesResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ListCommentsRequest(arg) {
  if (!(arg instanceof rpc_comments_pb.ListCommentsRequest)) {
    throw new Error('Expected argument of type pb.ListCommentsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ListCommentsRequest(buffer_arg) {
  return rpc_comments_pb.ListCommentsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ListCommentsResponse(arg) {
  if (!(arg instanceof rpc_comments_pb.ListCommentsResponse)) {
    throw new Error('Expected argument of type pb.ListCommentsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ListCommentsResponse(buffer_arg) {
  return rpc_comments_pb.ListCommentsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ListItemsRequest(arg) {
  if (!(arg instanceof rpc_playlist_pb.ListItemsRequest)) {
    throw new Error('Expected argument of type pb.ListItemsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ListItemsRequest(buffer_arg) {
  return rpc_playlist_pb.ListItemsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ListItemsResponse(arg) {
  if (!(arg instanceof rpc_playlist_pb.ListItemsResponse)) {
    throw new Error('Expected argument of type pb.ListItemsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ListItemsResponse(buffer_arg) {
  return rpc_playlist_pb.ListItemsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ListPlaylistsRequest(arg) {
  if (!(arg instanceof rpc_playlist_pb.ListPlaylistsRequest)) {
    throw new Error('Expected argument of type pb.ListPlaylistsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ListPlaylistsRequest(buffer_arg) {
  return rpc_playlist_pb.ListPlaylistsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ListPlaylistsResponse(arg) {
  if (!(arg instanceof rpc_playlist_pb.ListPlaylistsResponse)) {
    throw new Error('Expected argument of type pb.ListPlaylistsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ListPlaylistsResponse(buffer_arg) {
  return rpc_playlist_pb.ListPlaylistsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ListSubcategoriesRequest(arg) {
  if (!(arg instanceof rpc_category_pb.ListSubcategoriesRequest)) {
    throw new Error('Expected argument of type pb.ListSubcategoriesRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ListSubcategoriesRequest(buffer_arg) {
  return rpc_category_pb.ListSubcategoriesRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ListSubcategoriesResponse(arg) {
  if (!(arg instanceof rpc_category_pb.ListSubcategoriesResponse)) {
    throw new Error('Expected argument of type pb.ListSubcategoriesResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ListSubcategoriesResponse(buffer_arg) {
  return rpc_category_pb.ListSubcategoriesResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_LiveManifestRequest(arg) {
  if (!(arg instanceof rpc_streamLive_pb.LiveManifestRequest)) {
    throw new Error('Expected argument of type pb.LiveManifestRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_LiveManifestRequest(buffer_arg) {
  return rpc_streamLive_pb.LiveManifestRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_LiveManifestUpdate(arg) {
  if (!(arg instanceof rpc_streamLive_pb.LiveManifestUpdate)) {
    throw new Error('Expected argument of type pb.LiveManifestUpdate');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_LiveManifestUpdate(buffer_arg) {
  return rpc_streamLive_pb.LiveManifestUpdate.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ManifestRequest(arg) {
  if (!(arg instanceof rpc_stream_pb.ManifestRequest)) {
    throw new Error('Expected argument of type pb.ManifestRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ManifestRequest(buffer_arg) {
  return rpc_stream_pb.ManifestRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_ManifestResponse(arg) {
  if (!(arg instanceof rpc_stream_pb.ManifestResponse)) {
    throw new Error('Expected argument of type pb.ManifestResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_ManifestResponse(buffer_arg) {
  return rpc_stream_pb.ManifestResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_MetadataResponse(arg) {
  if (!(arg instanceof rpc_Home_pb.MetadataResponse)) {
    throw new Error('Expected argument of type pb.MetadataResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_MetadataResponse(buffer_arg) {
  return rpc_Home_pb.MetadataResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_MoveItemRequest(arg) {
  if (!(arg instanceof rpc_playlist_pb.MoveItemRequest)) {
    throw new Error('Expected argument of type pb.MoveItemRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_MoveItemRequest(buffer_arg) {
  return rpc_playlist_pb.MoveItemRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_Playlist(arg) {
  if (!(arg instanceof rpc_playlist_pb.Playlist)) {
    throw new Error('Expected argument of type pb.Playlist');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_Playlist(buffer_arg) {
  return rpc_playlist_pb.Playlist.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_PlaylistItem(arg) {
  if (!(arg instanceof rpc_playlist_pb.PlaylistItem)) {
    throw new Error('Expected argument of type pb.PlaylistItem');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_PlaylistItem(buffer_arg) {
  return rpc_playlist_pb.PlaylistItem.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_PostCommentRequest(arg) {
  if (!(arg instanceof rpc_comments_pb.PostCommentRequest)) {
    throw new Error('Expected argument of type pb.PostCommentRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_PostCommentRequest(buffer_arg) {
  return rpc_comments_pb.PostCommentRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_PostCommentResponse(arg) {
  if (!(arg instanceof rpc_comments_pb.PostCommentResponse)) {
    throw new Error('Expected argument of type pb.PostCommentResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_PostCommentResponse(buffer_arg) {
  return rpc_comments_pb.PostCommentResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_PreviewRequest(arg) {
  if (!(arg instanceof rpc_preview_pb.PreviewRequest)) {
    throw new Error('Expected argument of type pb.PreviewRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_PreviewRequest(buffer_arg) {
  return rpc_preview_pb.PreviewRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_PreviewResponse(arg) {
  if (!(arg instanceof rpc_preview_pb.PreviewResponse)) {
    throw new Error('Expected argument of type pb.PreviewResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_PreviewResponse(buffer_arg) {
  return rpc_preview_pb.PreviewResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_RecommendedKeywordsResponse(arg) {
  if (!(arg instanceof rpc_Home_pb.RecommendedKeywordsResponse)) {
    throw new Error('Expected argument of type pb.RecommendedKeywordsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_RecommendedKeywordsResponse(buffer_arg) {
  return rpc_Home_pb.RecommendedKeywordsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_RefreshRequest(arg) {
  if (!(arg instanceof session_pb.RefreshRequest)) {
    throw new Error('Expected argument of type pb.RefreshRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_RefreshRequest(buffer_arg) {
  return session_pb.RefreshRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_RemoveItemRequest(arg) {
  if (!(arg instanceof rpc_playlist_pb.RemoveItemRequest)) {
    throw new Error('Expected argument of type pb.RemoveItemRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_RemoveItemRequest(buffer_arg) {
  return rpc_playlist_pb.RemoveItemRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SearchRequest(arg) {
  if (!(arg instanceof rpc_search_pb.SearchRequest)) {
    throw new Error('Expected argument of type pb.SearchRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SearchRequest(buffer_arg) {
  return rpc_search_pb.SearchRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SearchResponse(arg) {
  if (!(arg instanceof rpc_search_pb.SearchResponse)) {
    throw new Error('Expected argument of type pb.SearchResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SearchResponse(buffer_arg) {
  return rpc_search_pb.SearchResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SegmentChunk(arg) {
  if (!(arg instanceof rpc_stream_pb.SegmentChunk)) {
    throw new Error('Expected argument of type pb.SegmentChunk');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SegmentChunk(buffer_arg) {
  return rpc_stream_pb.SegmentChunk.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SegmentRequest(arg) {
  if (!(arg instanceof rpc_stream_pb.SegmentRequest)) {
    throw new Error('Expected argument of type pb.SegmentRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SegmentRequest(buffer_arg) {
  return rpc_stream_pb.SegmentRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SessionResponse(arg) {
  if (!(arg instanceof session_pb.SessionResponse)) {
    throw new Error('Expected argument of type pb.SessionResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SessionResponse(buffer_arg) {
  return session_pb.SessionResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SiginRequest(arg) {
  if (!(arg instanceof session_pb.SiginRequest)) {
    throw new Error('Expected argument of type pb.SiginRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SiginRequest(buffer_arg) {
  return session_pb.SiginRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_StreamVideoChunk(arg) {
  if (!(arg instanceof rpc_streamLive_pb.StreamVideoChunk)) {
    throw new Error('Expected argument of type pb.StreamVideoChunk');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_StreamVideoChunk(buffer_arg) {
  return rpc_streamLive_pb.StreamVideoChunk.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_StreamVideoRequest(arg) {
  if (!(arg instanceof rpc_streamLive_pb.StreamVideoRequest)) {
    throw new Error('Expected argument of type pb.StreamVideoRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_StreamVideoRequest(buffer_arg) {
  return rpc_streamLive_pb.StreamVideoRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SubmitEditRequest(arg) {
  if (!(arg instanceof rpc_video_edit_pb.SubmitEditRequest)) {
    throw new Error('Expected argument of type pb.SubmitEditRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SubmitEditRequest(buffer_arg) {
  return rpc_video_edit_pb.SubmitEditRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SubmitEditResponse(arg) {
  if (!(arg instanceof rpc_video_edit_pb.SubmitEditResponse)) {
    throw new Error('Expected argument of type pb.SubmitEditResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SubmitEditResponse(buffer_arg) {
  return rpc_video_edit_pb.SubmitEditResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SubscribeRequest(arg) {
  if (!(arg instanceof rpc_subscription_pb.SubscribeRequest)) {
    throw new Error('Expected argument of type pb.SubscribeRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SubscribeRequest(buffer_arg) {
  return rpc_subscription_pb.SubscribeRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SubscribedResponse(arg) {
  if (!(arg instanceof rpc_subscription_pb.SubscribedResponse)) {
    throw new Error('Expected argument of type pb.SubscribedResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SubscribedResponse(buffer_arg) {
  return rpc_subscription_pb.SubscribedResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SubscribersResponse(arg) {
  if (!(arg instanceof rpc_subscription_pb.SubscribersResponse)) {
    throw new Error('Expected argument of type pb.SubscribersResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SubscribersResponse(buffer_arg) {
  return rpc_subscription_pb.SubscribersResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SubscriptionStatus(arg) {
  if (!(arg instanceof rpc_subscription_pb.SubscriptionStatus)) {
    throw new Error('Expected argument of type pb.SubscriptionStatus');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SubscriptionStatus(buffer_arg) {
  return rpc_subscription_pb.SubscriptionStatus.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_SwitchChannelRequest(arg) {
  if (!(arg instanceof session_pb.SwitchChannelRequest)) {
    throw new Error('Expected argument of type pb.SwitchChannelRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_SwitchChannelRequest(buffer_arg) {
  return session_pb.SwitchChannelRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_UpdateCategoryRequest(arg) {
  if (!(arg instanceof rpc_category_pb.UpdateCategoryRequest)) {
    throw new Error('Expected argument of type pb.UpdateCategoryRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_UpdateCategoryRequest(buffer_arg) {
  return rpc_category_pb.UpdateCategoryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_UpdateCategoryResponse(arg) {
  if (!(arg instanceof rpc_category_pb.UpdateCategoryResponse)) {
    throw new Error('Expected argument of type pb.UpdateCategoryResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_UpdateCategoryResponse(buffer_arg) {
  return rpc_category_pb.UpdateCategoryResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_UpdateChannelRequest(arg) {
  if (!(arg instanceof rpc_Channel_pb.UpdateChannelRequest)) {
    throw new Error('Expected argument of type pb.UpdateChannelRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_UpdateChannelRequest(buffer_arg) {
  return rpc_Channel_pb.UpdateChannelRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_UpdateChannelResponse(arg) {
  if (!(arg instanceof rpc_Channel_pb.UpdateChannelResponse)) {
    throw new Error('Expected argument of type pb.UpdateChannelResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_UpdateChannelResponse(buffer_arg) {
  return rpc_Channel_pb.UpdateChannelResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_UpdatePlaylistRequest(arg) {
  if (!(arg instanceof rpc_playlist_pb.UpdatePlaylistRequest)) {
    throw new Error('Expected argument of type pb.UpdatePlaylistRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_UpdatePlaylistRequest(buffer_arg) {
  return rpc_playlist_pb.UpdatePlaylistRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_UpdateSubcategoryRequest(arg) {
  if (!(arg instanceof rpc_category_pb.UpdateSubcategoryRequest)) {
    throw new Error('Expected argument of type pb.UpdateSubcategoryRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_UpdateSubcategoryRequest(buffer_arg) {
  return rpc_category_pb.UpdateSubcategoryRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_UpdateSubcategoryResponse(arg) {
  if (!(arg instanceof rpc_category_pb.UpdateSubcategoryResponse)) {
    throw new Error('Expected argument of type pb.UpdateSubcategoryResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_UpdateSubcategoryResponse(buffer_arg) {
  return rpc_category_pb.UpdateSubcategoryResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_UploadFile(arg) {
  if (!(arg instanceof rpc_upload_pb.UploadFile)) {
    throw new Error('Expected argument of type pb.UploadFile');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_UploadFile(buffer_arg) {
  return rpc_upload_pb.UploadFile.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_UploadFileResponse(arg) {
  if (!(arg instanceof rpc_upload_pb.UploadFileResponse)) {
    throw new Error('Expected argument of type pb.UploadFileResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_UploadFileResponse(buffer_arg) {
  return rpc_upload_pb.UploadFileResponse.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_VideoContextRequest(arg) {
  if (!(arg instanceof rpc_Home_pb.VideoContextRequest)) {
    throw new Error('Expected argument of type pb.VideoContextRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_VideoContextRequest(buffer_arg) {
  return rpc_Home_pb.VideoContextRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_VideoDetailsRequest(arg) {
  if (!(arg instanceof rpc_Home_pb.VideoDetailsRequest)) {
    throw new Error('Expected argument of type pb.VideoDetailsRequest');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_VideoDetailsRequest(buffer_arg) {
  return rpc_Home_pb.VideoDetailsRequest.deserializeBinary(new Uint8Array(buffer_arg));
}

function serialize_pb_VideoDetailsResponse(arg) {
  if (!(arg instanceof rpc_editvideo_pb.VideoDetailsResponse)) {
    throw new Error('Expected argument of type pb.VideoDetailsResponse');
  }
  return Buffer.from(arg.serializeBinary());
}

function deserialize_pb_VideoDetailsResponse(buffer_arg) {
  return rpc_editvideo_pb.VideoDetailsResponse.deserializeBinary(new Uint8Array(buffer_arg));
}


// / YoutubeClone defines the main gRPC API for the YouTube-like platform.
// / It aggregates authentication, video streaming, search, playlists,
// / comments, reactions, and live streaming services.
var YoutubeCloneService = exports.YoutubeCloneService = {
  // rpc GetVideoInit(InitRequest) returns (InitResponse);
// Get gif
gif: {
    path: '/pb.YoutubeClone/Gif',
    requestStream: false,
    responseStream: false,
    requestType: rpc_gif_pb.GetGifRequest,
    responseType: rpc_gif_pb.GetGifResponse,
    requestSerialize: serialize_pb_GetGifRequest,
    requestDeserialize: deserialize_pb_GetGifRequest,
    responseSerialize: serialize_pb_GetGifResponse,
    responseDeserialize: deserialize_pb_GetGifResponse,
  },
  // / //session
signin: {
    path: '/pb.YoutubeClone/Signin',
    requestStream: false,
    responseStream: false,
    requestType: session_pb.SiginRequest,
    responseType: session_pb.SessionResponse,
    requestSerialize: serialize_pb_SiginRequest,
    requestDeserialize: deserialize_pb_SiginRequest,
    responseSerialize: serialize_pb_SessionResponse,
    responseDeserialize: deserialize_pb_SessionResponse,
  },
  checkAuth: {
    path: '/pb.YoutubeClone/CheckAuth',
    requestStream: false,
    responseStream: false,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: session_pb.CheckAuthResponse,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_pb_CheckAuthResponse,
    responseDeserialize: deserialize_pb_CheckAuthResponse,
  },
  refreshToken: {
    path: '/pb.YoutubeClone/RefreshToken',
    requestStream: false,
    responseStream: false,
    requestType: session_pb.RefreshRequest,
    responseType: session_pb.SessionResponse,
    requestSerialize: serialize_pb_RefreshRequest,
    requestDeserialize: deserialize_pb_RefreshRequest,
    responseSerialize: serialize_pb_SessionResponse,
    responseDeserialize: deserialize_pb_SessionResponse,
  },
  switchChannel: {
    path: '/pb.YoutubeClone/SwitchChannel',
    requestStream: false,
    responseStream: false,
    requestType: session_pb.SwitchChannelRequest,
    responseType: session_pb.SessionResponse,
    requestSerialize: serialize_pb_SwitchChannelRequest,
    requestDeserialize: deserialize_pb_SwitchChannelRequest,
    responseSerialize: serialize_pb_SessionResponse,
    responseDeserialize: deserialize_pb_SessionResponse,
  },
  uploadFiles: {
    path: '/pb.YoutubeClone/UploadFiles',
    requestStream: false,
    responseStream: false,
    requestType: rpc_upload_pb.UploadFile,
    responseType: rpc_upload_pb.UploadFileResponse,
    requestSerialize: serialize_pb_UploadFile,
    requestDeserialize: deserialize_pb_UploadFile,
    responseSerialize: serialize_pb_UploadFileResponse,
    responseDeserialize: deserialize_pb_UploadFileResponse,
  },
  // stream
// rpc GetManifests(ManifestRequest) returns (ManifestResponse) {};
// rpc GetMediaSegments(MediaSegmentsRequest) returns (stream MediaSegmentsResponse) {};
// rpc ReportNetworkMetrics(NetworkMetrics) returns (MetricAck) {};
getVideos: {
    path: '/pb.YoutubeClone/GetVideos',
    requestStream: false,
    responseStream: true,
    requestType: rpc_Home_pb.GetVideosRequest,
    responseType: rpc_Home_pb.GetVideosResponse,
    requestSerialize: serialize_pb_GetVideosRequest,
    requestDeserialize: deserialize_pb_GetVideosRequest,
    responseSerialize: serialize_pb_GetVideosResponse,
    responseDeserialize: deserialize_pb_GetVideosResponse,
  },
  // / channel
signinChannel: {
    path: '/pb.YoutubeClone/signinChannel',
    requestStream: false,
    responseStream: false,
    requestType: rpc_Channel_pb.ChannelRequest,
    responseType: session_pb.SessionResponse,
    requestSerialize: serialize_pb_ChannelRequest,
    requestDeserialize: deserialize_pb_ChannelRequest,
    responseSerialize: serialize_pb_SessionResponse,
    responseDeserialize: deserialize_pb_SessionResponse,
  },
  createChannel: {
    path: '/pb.YoutubeClone/CreateChannel',
    requestStream: false,
    responseStream: false,
    requestType: rpc_Channel_pb.CreateChannelRequest,
    responseType: rpc_Channel_pb.CreateChannelResponse,
    requestSerialize: serialize_pb_CreateChannelRequest,
    requestDeserialize: deserialize_pb_CreateChannelRequest,
    responseSerialize: serialize_pb_CreateChannelResponse,
    responseDeserialize: deserialize_pb_CreateChannelResponse,
  },
  listUserChannels: {
    path: '/pb.YoutubeClone/ListUserChannels',
    requestStream: false,
    responseStream: true,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: rpc_Channel_pb.ChannelResponse,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_pb_ChannelResponse,
    responseDeserialize: deserialize_pb_ChannelResponse,
  },
  updateChannel: {
    path: '/pb.YoutubeClone/UpdateChannel',
    requestStream: false,
    responseStream: false,
    requestType: rpc_Channel_pb.UpdateChannelRequest,
    responseType: rpc_Channel_pb.UpdateChannelResponse,
    requestSerialize: serialize_pb_UpdateChannelRequest,
    requestDeserialize: deserialize_pb_UpdateChannelRequest,
    responseSerialize: serialize_pb_UpdateChannelResponse,
    responseDeserialize: deserialize_pb_UpdateChannelResponse,
  },
  getChannel: {
    path: '/pb.YoutubeClone/GetChannel',
    requestStream: false,
    responseStream: false,
    requestType: rpc_Channel_pb.ChannelRequest,
    responseType: rpc_Channel_pb.GetChannelResponse,
    requestSerialize: serialize_pb_ChannelRequest,
    requestDeserialize: deserialize_pb_ChannelRequest,
    responseSerialize: serialize_pb_GetChannelResponse,
    responseDeserialize: deserialize_pb_GetChannelResponse,
  },
  // Stream 
getManifest: {
    path: '/pb.YoutubeClone/GetManifest',
    requestStream: false,
    responseStream: false,
    requestType: rpc_stream_pb.ManifestRequest,
    responseType: rpc_stream_pb.ManifestResponse,
    requestSerialize: serialize_pb_ManifestRequest,
    requestDeserialize: deserialize_pb_ManifestRequest,
    responseSerialize: serialize_pb_ManifestResponse,
    responseDeserialize: deserialize_pb_ManifestResponse,
  },
  streamSegment: {
    path: '/pb.YoutubeClone/StreamSegment',
    requestStream: false,
    responseStream: true,
    requestType: rpc_stream_pb.SegmentRequest,
    responseType: rpc_stream_pb.SegmentChunk,
    requestSerialize: serialize_pb_SegmentRequest,
    requestDeserialize: deserialize_pb_SegmentRequest,
    responseSerialize: serialize_pb_SegmentChunk,
    responseDeserialize: deserialize_pb_SegmentChunk,
  },
  // category definition
createCategory: {
    path: '/pb.YoutubeClone/CreateCategory',
    requestStream: false,
    responseStream: false,
    requestType: rpc_category_pb.CreateCategoryRequest,
    responseType: rpc_category_pb.CreateCategoryResponse,
    requestSerialize: serialize_pb_CreateCategoryRequest,
    requestDeserialize: deserialize_pb_CreateCategoryRequest,
    responseSerialize: serialize_pb_CreateCategoryResponse,
    responseDeserialize: deserialize_pb_CreateCategoryResponse,
  },
  updateCategory: {
    path: '/pb.YoutubeClone/UpdateCategory',
    requestStream: false,
    responseStream: false,
    requestType: rpc_category_pb.UpdateCategoryRequest,
    responseType: rpc_category_pb.UpdateCategoryResponse,
    requestSerialize: serialize_pb_UpdateCategoryRequest,
    requestDeserialize: deserialize_pb_UpdateCategoryRequest,
    responseSerialize: serialize_pb_UpdateCategoryResponse,
    responseDeserialize: deserialize_pb_UpdateCategoryResponse,
  },
  listCategories: {
    path: '/pb.YoutubeClone/ListCategories',
    requestStream: false,
    responseStream: false,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: rpc_category_pb.ListCategoriesResponse,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_pb_ListCategoriesResponse,
    responseDeserialize: deserialize_pb_ListCategoriesResponse,
  },
  deleteCategory: {
    path: '/pb.YoutubeClone/DeleteCategory',
    requestStream: false,
    responseStream: false,
    requestType: rpc_category_pb.DeleteCategoryRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_pb_DeleteCategoryRequest,
    requestDeserialize: deserialize_pb_DeleteCategoryRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  // subcategory definition
createSubcategory: {
    path: '/pb.YoutubeClone/CreateSubcategory',
    requestStream: false,
    responseStream: false,
    requestType: rpc_category_pb.CreateSubcategoryRequest,
    responseType: rpc_category_pb.CreateSubcategoryResponse,
    requestSerialize: serialize_pb_CreateSubcategoryRequest,
    requestDeserialize: deserialize_pb_CreateSubcategoryRequest,
    responseSerialize: serialize_pb_CreateSubcategoryResponse,
    responseDeserialize: deserialize_pb_CreateSubcategoryResponse,
  },
  updateSubcategory: {
    path: '/pb.YoutubeClone/UpdateSubcategory',
    requestStream: false,
    responseStream: false,
    requestType: rpc_category_pb.UpdateSubcategoryRequest,
    responseType: rpc_category_pb.UpdateSubcategoryResponse,
    requestSerialize: serialize_pb_UpdateSubcategoryRequest,
    requestDeserialize: deserialize_pb_UpdateSubcategoryRequest,
    responseSerialize: serialize_pb_UpdateSubcategoryResponse,
    responseDeserialize: deserialize_pb_UpdateSubcategoryResponse,
  },
  listSubcategories: {
    path: '/pb.YoutubeClone/ListSubcategories',
    requestStream: false,
    responseStream: false,
    requestType: rpc_category_pb.ListSubcategoriesRequest,
    responseType: rpc_category_pb.ListSubcategoriesResponse,
    requestSerialize: serialize_pb_ListSubcategoriesRequest,
    requestDeserialize: deserialize_pb_ListSubcategoriesRequest,
    responseSerialize: serialize_pb_ListSubcategoriesResponse,
    responseDeserialize: deserialize_pb_ListSubcategoriesResponse,
  },
  deleteSubcategory: {
    path: '/pb.YoutubeClone/DeleteSubcategory',
    requestStream: false,
    responseStream: false,
    requestType: rpc_category_pb.DeleteSubcategoryRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_pb_DeleteSubcategoryRequest,
    requestDeserialize: deserialize_pb_DeleteSubcategoryRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  // searches
//
autocomplete: {
    path: '/pb.YoutubeClone/Autocomplete',
    requestStream: false,
    responseStream: false,
    requestType: rpc_search_pb.AutocompleteRequest,
    responseType: rpc_search_pb.AutocompleteResponse,
    requestSerialize: serialize_pb_AutocompleteRequest,
    requestDeserialize: deserialize_pb_AutocompleteRequest,
    responseSerialize: serialize_pb_AutocompleteResponse,
    responseDeserialize: deserialize_pb_AutocompleteResponse,
  },
  search: {
    path: '/pb.YoutubeClone/Search',
    requestStream: false,
    responseStream: false,
    requestType: rpc_search_pb.SearchRequest,
    responseType: rpc_search_pb.SearchResponse,
    requestSerialize: serialize_pb_SearchRequest,
    requestDeserialize: deserialize_pb_SearchRequest,
    responseSerialize: serialize_pb_SearchResponse,
    responseDeserialize: deserialize_pb_SearchResponse,
  },
  // Edit Video
// rpc EditVideoTags(EditVideoTagsRequest) returns (EditVideoTagsResponse);
updateVideoDetails: {
    path: '/pb.YoutubeClone/UpdateVideoDetails',
    requestStream: false,
    responseStream: false,
    requestType: rpc_editvideo_pb.EditeVideoDetailsRequest,
    responseType: rpc_editvideo_pb.VideoDetailsResponse,
    requestSerialize: serialize_pb_EditeVideoDetailsRequest,
    requestDeserialize: deserialize_pb_EditeVideoDetailsRequest,
    responseSerialize: serialize_pb_VideoDetailsResponse,
    responseDeserialize: deserialize_pb_VideoDetailsResponse,
  },
  // /get video details
getVideoDetails: {
    path: '/pb.YoutubeClone/GetVideoDetails',
    requestStream: false,
    responseStream: false,
    requestType: rpc_editvideo_pb.GetVideoDetailRequest,
    responseType: rpc_editvideo_pb.VideoDetailsResponse,
    requestSerialize: serialize_pb_GetVideoDetailRequest,
    requestDeserialize: deserialize_pb_GetVideoDetailRequest,
    responseSerialize: serialize_pb_VideoDetailsResponse,
    responseDeserialize: deserialize_pb_VideoDetailsResponse,
  },
  // delete video rpc
deleteVideo: {
    path: '/pb.YoutubeClone/DeleteVideo',
    requestStream: false,
    responseStream: false,
    requestType: rpc_editvideo_pb.DeletesVideoRequest,
    responseType: rpc_editvideo_pb.DeletesVideoResponse,
    requestSerialize: serialize_pb_DeletesVideoRequest,
    requestDeserialize: deserialize_pb_DeletesVideoRequest,
    responseSerialize: serialize_pb_DeletesVideoResponse,
    responseDeserialize: deserialize_pb_DeletesVideoResponse,
  },
  // Filter video context
getkeyword: {
    path: '/pb.YoutubeClone/Getkeyword',
    requestStream: false,
    responseStream: false,
    requestType: rpc_Home_pb.VideoContextRequest,
    responseType: rpc_Home_pb.RecommendedKeywordsResponse,
    requestSerialize: serialize_pb_VideoContextRequest,
    requestDeserialize: deserialize_pb_VideoContextRequest,
    responseSerialize: serialize_pb_RecommendedKeywordsResponse,
    responseDeserialize: deserialize_pb_RecommendedKeywordsResponse,
  },
  videoMetadata: {
    path: '/pb.YoutubeClone/VideoMetadata',
    requestStream: false,
    responseStream: false,
    requestType: rpc_Home_pb.VideoDetailsRequest,
    responseType: rpc_Home_pb.MetadataResponse,
    requestSerialize: serialize_pb_VideoDetailsRequest,
    requestDeserialize: deserialize_pb_VideoDetailsRequest,
    responseSerialize: serialize_pb_MetadataResponse,
    responseDeserialize: deserialize_pb_MetadataResponse,
  },
  // Home
// rpc GetHomeFilter(google.protobuf.Empty) returns (RecommendedFiltersResponse);
// comments rpc's
createComment: {
    path: '/pb.YoutubeClone/CreateComment',
    requestStream: false,
    responseStream: false,
    requestType: rpc_comments_pb.PostCommentRequest,
    responseType: rpc_comments_pb.PostCommentResponse,
    requestSerialize: serialize_pb_PostCommentRequest,
    requestDeserialize: deserialize_pb_PostCommentRequest,
    responseSerialize: serialize_pb_PostCommentResponse,
    responseDeserialize: deserialize_pb_PostCommentResponse,
  },
  listComments: {
    path: '/pb.YoutubeClone/ListComments',
    requestStream: false,
    responseStream: false,
    requestType: rpc_comments_pb.ListCommentsRequest,
    responseType: rpc_comments_pb.ListCommentsResponse,
    requestSerialize: serialize_pb_ListCommentsRequest,
    requestDeserialize: deserialize_pb_ListCommentsRequest,
    responseSerialize: serialize_pb_ListCommentsResponse,
    responseDeserialize: deserialize_pb_ListCommentsResponse,
  },
  getCommentCount: {
    path: '/pb.YoutubeClone/GetCommentCount',
    requestStream: false,
    responseStream: false,
    requestType: rpc_comments_pb.GetCommentCountRequest,
    responseType: rpc_comments_pb.GetCommentCountResponse,
    requestSerialize: serialize_pb_GetCommentCountRequest,
    requestDeserialize: deserialize_pb_GetCommentCountRequest,
    responseSerialize: serialize_pb_GetCommentCountResponse,
    responseDeserialize: deserialize_pb_GetCommentCountResponse,
  },
  // rpc CreateReply(PostCommentRequest) returns (CreateReplyResponse);
editcomment: {
    path: '/pb.YoutubeClone/Editcomment',
    requestStream: false,
    responseStream: false,
    requestType: rpc_comments_pb.EditCommentRequest,
    responseType: rpc_comments_pb.Comment,
    requestSerialize: serialize_pb_EditCommentRequest,
    requestDeserialize: deserialize_pb_EditCommentRequest,
    responseSerialize: serialize_pb_Comment,
    responseDeserialize: deserialize_pb_Comment,
  },
  replies: {
    path: '/pb.YoutubeClone/Replies',
    requestStream: false,
    responseStream: false,
    requestType: rpc_comments_pb.GetRepliesRequest,
    responseType: rpc_comments_pb.GetRepliesResponse,
    requestSerialize: serialize_pb_GetRepliesRequest,
    requestDeserialize: deserialize_pb_GetRepliesRequest,
    responseSerialize: serialize_pb_GetRepliesResponse,
    responseDeserialize: deserialize_pb_GetRepliesResponse,
  },
  deleteComment: {
    path: '/pb.YoutubeClone/DeleteComment',
    requestStream: false,
    responseStream: false,
    requestType: rpc_comments_pb.DeleteCommentRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_pb_DeleteCommentRequest,
    requestDeserialize: deserialize_pb_DeleteCommentRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  // reaction
reactToComment: {
    path: '/pb.YoutubeClone/ReactToComment',
    requestStream: false,
    responseStream: false,
    requestType: rpc_reaction_pb.LikeCommentRequest,
    responseType: rpc_reaction_pb.LikeCommentResponse,
    requestSerialize: serialize_pb_LikeCommentRequest,
    requestDeserialize: deserialize_pb_LikeCommentRequest,
    responseSerialize: serialize_pb_LikeCommentResponse,
    responseDeserialize: deserialize_pb_LikeCommentResponse,
  },
  // Subscription
subscribe: {
    path: '/pb.YoutubeClone/Subscribe',
    requestStream: false,
    responseStream: false,
    requestType: rpc_subscription_pb.SubscribeRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_pb_SubscribeRequest,
    requestDeserialize: deserialize_pb_SubscribeRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  unsubscribe: {
    path: '/pb.YoutubeClone/Unsubscribe',
    requestStream: false,
    responseStream: false,
    requestType: rpc_subscription_pb.SubscribeRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_pb_SubscribeRequest,
    requestDeserialize: deserialize_pb_SubscribeRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  getSubscriptionStatus: {
    path: '/pb.YoutubeClone/GetSubscriptionStatus',
    requestStream: false,
    responseStream: false,
    requestType: rpc_subscription_pb.SubscribeRequest,
    responseType: rpc_subscription_pb.SubscriptionStatus,
    requestSerialize: serialize_pb_SubscribeRequest,
    requestDeserialize: deserialize_pb_SubscribeRequest,
    responseSerialize: serialize_pb_SubscriptionStatus,
    responseDeserialize: deserialize_pb_SubscriptionStatus,
  },
  listSubscriptions: {
    path: '/pb.YoutubeClone/ListSubscriptions',
    requestStream: false,
    responseStream: true,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: rpc_subscription_pb.SubscribersResponse,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_pb_SubscribersResponse,
    responseDeserialize: deserialize_pb_SubscribersResponse,
  },
  subscribed: {
    path: '/pb.YoutubeClone/Subscribed',
    requestStream: false,
    responseStream: true,
    requestType: google_protobuf_empty_pb.Empty,
    responseType: rpc_subscription_pb.SubscribedResponse,
    requestSerialize: serialize_google_protobuf_Empty,
    requestDeserialize: deserialize_google_protobuf_Empty,
    responseSerialize: serialize_pb_SubscribedResponse,
    responseDeserialize: deserialize_pb_SubscribedResponse,
  },
  // ========== Playlist Service Definition ========== //
createPlaylist: {
    path: '/pb.YoutubeClone/CreatePlaylist',
    requestStream: false,
    responseStream: false,
    requestType: rpc_playlist_pb.CreatePlaylistRequest,
    responseType: rpc_playlist_pb.Playlist,
    requestSerialize: serialize_pb_CreatePlaylistRequest,
    requestDeserialize: deserialize_pb_CreatePlaylistRequest,
    responseSerialize: serialize_pb_Playlist,
    responseDeserialize: deserialize_pb_Playlist,
  },
  getPlaylist: {
    path: '/pb.YoutubeClone/GetPlaylist',
    requestStream: false,
    responseStream: false,
    requestType: rpc_playlist_pb.GetPlaylistRequest,
    responseType: rpc_playlist_pb.Playlist,
    requestSerialize: serialize_pb_GetPlaylistRequest,
    requestDeserialize: deserialize_pb_GetPlaylistRequest,
    responseSerialize: serialize_pb_Playlist,
    responseDeserialize: deserialize_pb_Playlist,
  },
  listPlaylists: {
    path: '/pb.YoutubeClone/ListPlaylists',
    requestStream: false,
    responseStream: false,
    requestType: rpc_playlist_pb.ListPlaylistsRequest,
    responseType: rpc_playlist_pb.ListPlaylistsResponse,
    requestSerialize: serialize_pb_ListPlaylistsRequest,
    requestDeserialize: deserialize_pb_ListPlaylistsRequest,
    responseSerialize: serialize_pb_ListPlaylistsResponse,
    responseDeserialize: deserialize_pb_ListPlaylistsResponse,
  },
  updatePlaylist: {
    path: '/pb.YoutubeClone/UpdatePlaylist',
    requestStream: false,
    responseStream: false,
    requestType: rpc_playlist_pb.UpdatePlaylistRequest,
    responseType: rpc_playlist_pb.Playlist,
    requestSerialize: serialize_pb_UpdatePlaylistRequest,
    requestDeserialize: deserialize_pb_UpdatePlaylistRequest,
    responseSerialize: serialize_pb_Playlist,
    responseDeserialize: deserialize_pb_Playlist,
  },
  deletePlaylist: {
    path: '/pb.YoutubeClone/DeletePlaylist',
    requestStream: false,
    responseStream: false,
    requestType: rpc_playlist_pb.DeletePlaylistRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_pb_DeletePlaylistRequest,
    requestDeserialize: deserialize_pb_DeletePlaylistRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  // playlist items
addItem: {
    path: '/pb.YoutubeClone/AddItem',
    requestStream: false,
    responseStream: false,
    requestType: rpc_playlist_pb.AddItemRequest,
    responseType: rpc_playlist_pb.PlaylistItem,
    requestSerialize: serialize_pb_AddItemRequest,
    requestDeserialize: deserialize_pb_AddItemRequest,
    responseSerialize: serialize_pb_PlaylistItem,
    responseDeserialize: deserialize_pb_PlaylistItem,
  },
  removeItem: {
    path: '/pb.YoutubeClone/RemoveItem',
    requestStream: false,
    responseStream: false,
    requestType: rpc_playlist_pb.RemoveItemRequest,
    responseType: google_protobuf_empty_pb.Empty,
    requestSerialize: serialize_pb_RemoveItemRequest,
    requestDeserialize: deserialize_pb_RemoveItemRequest,
    responseSerialize: serialize_google_protobuf_Empty,
    responseDeserialize: deserialize_google_protobuf_Empty,
  },
  moveItem: {
    path: '/pb.YoutubeClone/MoveItem',
    requestStream: false,
    responseStream: false,
    requestType: rpc_playlist_pb.MoveItemRequest,
    responseType: rpc_playlist_pb.PlaylistItem,
    requestSerialize: serialize_pb_MoveItemRequest,
    requestDeserialize: deserialize_pb_MoveItemRequest,
    responseSerialize: serialize_pb_PlaylistItem,
    responseDeserialize: deserialize_pb_PlaylistItem,
  },
  listItems: {
    path: '/pb.YoutubeClone/ListItems',
    requestStream: false,
    responseStream: false,
    requestType: rpc_playlist_pb.ListItemsRequest,
    responseType: rpc_playlist_pb.ListItemsResponse,
    requestSerialize: serialize_pb_ListItemsRequest,
    requestDeserialize: deserialize_pb_ListItemsRequest,
    responseSerialize: serialize_pb_ListItemsResponse,
    responseDeserialize: deserialize_pb_ListItemsResponse,
  },
  // preview
//
getPreview: {
    path: '/pb.YoutubeClone/GetPreview',
    requestStream: false,
    responseStream: true,
    requestType: rpc_preview_pb.PreviewRequest,
    responseType: rpc_preview_pb.PreviewResponse,
    requestSerialize: serialize_pb_PreviewRequest,
    requestDeserialize: deserialize_pb_PreviewRequest,
    responseSerialize: serialize_pb_PreviewResponse,
    responseDeserialize: deserialize_pb_PreviewResponse,
  },
  // Video Edit Service Definition
//
submitEdit: {
    path: '/pb.YoutubeClone/SubmitEdit',
    requestStream: false,
    responseStream: false,
    requestType: rpc_video_edit_pb.SubmitEditRequest,
    responseType: rpc_video_edit_pb.SubmitEditResponse,
    requestSerialize: serialize_pb_SubmitEditRequest,
    requestDeserialize: deserialize_pb_SubmitEditRequest,
    responseSerialize: serialize_pb_SubmitEditResponse,
    responseDeserialize: deserialize_pb_SubmitEditResponse,
  },
  getEditStatus: {
    path: '/pb.YoutubeClone/GetEditStatus',
    requestStream: false,
    responseStream: false,
    requestType: rpc_video_edit_pb.GetEditStatusRequest,
    responseType: rpc_video_edit_pb.GetEditStatusResponse,
    requestSerialize: serialize_pb_GetEditStatusRequest,
    requestDeserialize: deserialize_pb_GetEditStatusRequest,
    responseSerialize: serialize_pb_GetEditStatusResponse,
    responseDeserialize: deserialize_pb_GetEditStatusResponse,
  },
  // Live streaming with live edge support
streamVideoLive: {
    path: '/pb.YoutubeClone/StreamVideoLive',
    requestStream: false,
    responseStream: true,
    requestType: rpc_streamLive_pb.StreamVideoRequest,
    responseType: rpc_streamLive_pb.StreamVideoChunk,
    requestSerialize: serialize_pb_StreamVideoRequest,
    requestDeserialize: deserialize_pb_StreamVideoRequest,
    responseSerialize: serialize_pb_StreamVideoChunk,
    responseDeserialize: deserialize_pb_StreamVideoChunk,
  },
  // Get current live edge information
getLiveEdgeInfo: {
    path: '/pb.YoutubeClone/GetLiveEdgeInfo',
    requestStream: false,
    responseStream: false,
    requestType: rpc_streamLive_pb.GetLiveEdgeRequest,
    responseType: rpc_streamLive_pb.GetLiveEdgeResponse,
    requestSerialize: serialize_pb_GetLiveEdgeRequest,
    requestDeserialize: deserialize_pb_GetLiveEdgeRequest,
    responseSerialize: serialize_pb_GetLiveEdgeResponse,
    responseDeserialize: deserialize_pb_GetLiveEdgeResponse,
  },
  // Subscribe to live manifest updates
streamLiveManifest: {
    path: '/pb.YoutubeClone/StreamLiveManifest',
    requestStream: false,
    responseStream: true,
    requestType: rpc_streamLive_pb.LiveManifestRequest,
    responseType: rpc_streamLive_pb.LiveManifestUpdate,
    requestSerialize: serialize_pb_LiveManifestRequest,
    requestDeserialize: deserialize_pb_LiveManifestRequest,
    responseSerialize: serialize_pb_LiveManifestUpdate,
    responseDeserialize: deserialize_pb_LiveManifestUpdate,
  },
};

exports.YoutubeCloneClient = grpc.makeGenericClientConstructor(YoutubeCloneService, 'YoutubeClone');
