module.exports = function(grunt) {

  grunt.initConfig({
    server_type: grunt.option('server_type'),
    env: grunt.option('env') || 'development',
    host: grunt.option('host') || '0.0.0.0'
  });

  if (!grunt.config('env')){
    grunt.fatal('请指定部署环境: development, staging, production');
  }
  
  if (!grunt.config('server_type')){
    grunt.fatal('请指定应用服务器类型，例如 --server_type=DA （DA：滚筒，DB：波轮，DC：干衣机）');
  }

  if (!grunt.option('host') && grunt.config('host') === '0.0.0.0'){
    grunt.warn('正在使用0.0.0.0作为服务器监听地址；生产环境下建议通过grunt --host= 参数设置内网地址！');
  }

  grunt.config('clean', {
    src: [
      'server/configuration/*.config.json',
      'server/lib/protocol/*.js',
      'swagger/*.*'
    ]
  });
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.config('copy', {
    main: {
      files: [
        {
          nonull: true,
          expand: true,
          cwd: 'server/configuration/<%= server_type %>/',
          src: ['*.*'],
          dest: 'server/configuration/'
        },
        // {
        //   nonull: true,
        //   expand: true,
        //   cwd: 'server/configuration/swagger/',
        //   src: ['*.*'],
        //   dest: 'swagger'
        // },
        {
          nonull: true,
          expand: true,
          cwd: 'server/configuration/<%= server_type %>/protocol/',
          src: ['*.*'],
          dest: 'server/lib/protocol'
        }
      ]
    }
  });
  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.config('convert', {
    yml2json: {
      files: [
        {
          expand: true,
          cwd: 'server/configuration/swagger/',
          src: ['*.yaml'],
          dest: 'swagger/',
          ext: '.json'
        }
      ]
    }
  });
  grunt.loadNpmTasks('grunt-convert');

  grunt.config('update_json', {
    options: {
      src: 'server/configuration/<%= server_type %>/<%= env %>.config.json',
      indent: '\t'
    },
    //update packages.json
    packages_config: {
      dest: 'package.json',
      fields: {
        name: function(src){ return 'proserver-' + grunt.config('server_type');}
      }
    },
    //update loopback config.json
    loopback_config: {
      dest: 'server/config.json',
      fields: {
        host: function(src) {return grunt.config('host')},
        port: null,
        //lately we can use app.settings.serverType to access proserver type (DA\DB\DC)
        serverType: function(src){ return grunt.config('server_type')}
      }
    },
    //update swagger-pro2open.json
    pro2open_config: {
      dest: 'swagger/swagger-pro2open.json',
      fields: {
        host: 'opencloud_host_port'
      }
    },
    //update swagger-pro2laundromat.json
    pro2laundromat_config: {
      dest: 'swagger/swagger-pro2laundromat.json',
      fields: {
        host: 'laundromat_host_port'
      }
    },
    //update swagger-pro2base.json
    pro2base_config: {
      dest: 'swagger/swagger-pro2base.json',
      fields: {
        host: 'mcloud_host_port'
      }
    }
  });
  grunt.loadNpmTasks('grunt-update-json');

  grunt.registerTask('prepare', [
    'clean',
    'copy',
    'convert',
    'update_json'
  ]);

};
